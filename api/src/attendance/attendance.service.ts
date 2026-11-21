import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { csvCell, scope } from "../hr/scope";
import { FaceService } from "./face.service";
import { ShiftService } from "../shifts/shifts.service";
import { decryptVec, euclid, haversine, localDate, toDay, validVec } from "./util";

const tenant = (u: AuthUser) => scope({ ...u, branchId: null, departmentId: null }).tenantId;
const restrict = (u: AuthUser) => { const { tenantId, ...r } = scope(u); return r; };
const json = (x: any) => JSON.parse(JSON.stringify(x));
const dOrU = (s?: string) => (s ? new Date(s) : undefined);

@Injectable()
export class AttendanceService {
  constructor(private db: PrismaService, private face: FaceService, private shifts: ShiftService) {}
  private async tz(t: string) { return (await this.db.company.findUnique({ where: { tenantId: t } }))?.timezone ?? "Asia/Kolkata"; }
  private async me(u: AuthUser) {
    const e = await this.db.employee.findFirst({ where: { userId: u.sub, tenantId: tenant(u), status: "ACTIVE" }, include: { branch: true } });
    if (!e) throw new BadRequestException("No employee profile is linked to your login");
    return e;
  }

  async today(u: AuthUser) {
    const e = await this.me(u), t = e.tenantId, wd = localDate(new Date(), await this.tz(t));
    const [rec, open, face] = await Promise.all([
      this.db.attendance.findUnique({ where: { tenantId_employeeId_workDate: { tenantId: t, employeeId: e.id, workDate: wd } } }),
      this.db.attendance.findFirst({ where: { tenantId: t, employeeId: e.id, checkInAt: { gte: new Date(Date.now() - 20 * 36e5) }, checkOutAt: null }, orderBy: { checkInAt: "desc" } }),
      this.face.status(u) ]);
    return { employee: { id: e.id, name: e.fullName, branch: e.branch?.name, geofenced: e.branch?.latitude != null }, today: rec, open, face };
  }
  async mine(u: AuthUser, month?: string) {
    const e = await this.me(u), m = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : new Date().toISOString().slice(0, 7);
    const from = toDay(m + "-01"), to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
    return this.db.attendance.findMany({ where: { tenantId: e.tenantId, employeeId: e.id, workDate: { gte: from, lt: to } }, orderBy: { workDate: "desc" } });
  }

  async punch(u: AuthUser, d: any, ip?: string, ua?: string) {
    const emp = await this.me(u), t = emp.tenantId, now = new Date();
    const log = (success: boolean, failReason?: string, extra: any = {}) => this.db.attendanceLog.create({ data: { tenantId: t, employeeId: emp.id, type: d.type, method: d.method, success, failReason, lat: d.lat, lng: d.lng, deviceInfo: ua?.slice(0, 250), ip, ...extra } });
    const fail = async (msg: string, extra: any = {}): Promise<never> => { await log(false, msg, extra); throw new BadRequestException(msg); };
    const extra: any = {}; const b = emp.branch, fenced = b?.latitude != null && b?.longitude != null;
    if (fenced || d.method === "GPS") {
      if (!fenced) return fail("Branch location (geofence) is not configured");
      if (d.lat == null || d.lng == null) return fail("Location is required for this branch");
      extra.distanceM = haversine(d.lat, d.lng, b!.latitude!, b!.longitude!);
      if (extra.distanceM > (b!.radiusMeters ?? 200)) return fail(`You are outside the branch area (${Math.round(extra.distanceM)} m away)`, { distanceM: extra.distanceM });
    }
    if (d.method === "FACE") {
      if ((await this.face.recentFailures(t, emp.id)) >= 5) return fail("Too many failed face attempts. Try again in 10 minutes.");
      if (!d.liveness) return fail("Liveness check not completed");
      if (!this.face.consume(u, d.challengeId)) return fail("Face session expired. Please retry.");
      const r = await this.face.verify(t, emp.id, d.descriptor); extra.matchDistance = r.distance;
      if (!r.ok) return fail(r.reason!, { matchDistance: r.distance });
    }
    if (d.method === "SELFIE") {
      const m = /^data:image\/jpeg;base64,(.+)$/.exec(d.selfie ?? ""); const buf = m ? Buffer.from(m[1], "base64") : null;
      if (!buf || buf.length > 200000 || buf[0] !== 0xff || buf[1] !== 0xd8) return fail("A valid selfie photo is required");
      extra.selfie = buf;   // TODO: move to S3 once configured
    }
    const tz = await this.tz(t); let wd = localDate(now, tz); let win: any = null;
    if (d.type === "CHECK_IN") { win = await this.shifts.windowFor(emp, now, tz); if (win) wd = win.workDate; }   // night shifts keep the shift-start date
    let rec;
    try {
      if (d.type === "CHECK_IN") {
        const ex = await this.db.attendance.findUnique({ where: { tenantId_employeeId_workDate: { tenantId: t, employeeId: emp.id, workDate: wd } } });
        if (ex?.checkInAt) return fail("You have already checked in today");
        const data = { status: "PRESENT" as const, checkInAt: now, method: d.method, branchId: emp.branchId, shiftId: win?.shift.id ?? null, isLate: !!win && win.lateMinutes > 0, lateMinutes: win?.lateMinutes ?? 0 };
        rec = ex ? await this.db.attendance.update({ where: { id: ex.id }, data }) : await this.db.attendance.create({ data: { tenantId: t, employeeId: emp.id, workDate: wd, ...data } });
      } else {   // overnight-safe: close the latest open check-in from the last 20h
        const open = await this.db.attendance.findFirst({ where: { tenantId: t, employeeId: emp.id, checkInAt: { gte: new Date(now.getTime() - 20 * 36e5) }, checkOutAt: null }, orderBy: { checkInAt: "desc" } });
        if (!open) return fail("No open check-in found");
        const mins = Math.round((+now - +open.checkInAt!) / 60000);
        rec = await this.db.attendance.update({ where: { id: open.id }, data: await this.shifts.closeData(open, now, tz) });
      }
    } catch (e: any) { if (e.code === "P2002") return fail("You have already checked in today"); throw e; }
    await log(true, undefined, { ...extra, attendanceId: rec.id });
    return rec;
  }

  async daily(u: AuthUser, date: string) {
    const t = tenant(u), wd = toDay(date || new Date().toISOString());
    if (isNaN(+wd)) throw new BadRequestException("Invalid date");
    const emps = await this.db.employee.findMany({ where: { ...scope(u), status: "ACTIVE", joiningDate: { lte: wd } }, orderBy: { fullName: "asc" }, take: 1000,
      select: { id: true, fullName: true, employeeCode: true, branchId: true, departmentId: true, branch: { select: { name: true } }, department: { select: { name: true } }, faceTemplate: { select: { id: true } } } });
    const [recs, res] = await Promise.all([this.db.attendance.findMany({ where: { tenantId: t, workDate: wd, employeeId: { in: emps.map(e => e.id) } } }), this.shifts.bulkResolve(t, wd, emps)]);
    const map = new Map(recs.map(r => [r.employeeId, r]));
    const rows = emps.map(e => { const r = res.get(e.id)!, a = map.get(e.id) ?? null, expected = r.holiday ? "HOLIDAY" : r.weekOff ? "WEEKLY_OFF" : null;
      return { employee: { id: e.id, fullName: e.fullName, employeeCode: e.employeeCode, branch: e.branch?.name, department: e.department?.name, faceEnrolled: !!e.faceTemplate },
        attendance: a, shift: r.shift ? { code: r.shift.code, name: r.shift.name } : null, expected, effective: a?.status ?? expected }; });
    const c = (st: string) => rows.filter(r => r.effective === st).length;
    return { date: wd.toISOString().slice(0, 10), summary: { total: rows.length, present: c("PRESENT"), halfDay: c("HALF_DAY"), absent: c("ABSENT"), onLeave: c("ON_LEAVE"), weeklyOff: c("WEEKLY_OFF"), holiday: c("HOLIDAY"), notMarked: rows.filter(r => !r.effective).length }, rows };
  }
  /** Close out a completed day: unmarked employees become HOLIDAY / WEEKLY_OFF / ABSENT. */
  async finalize(u: AuthUser, date: string) {
    const t = tenant(u), wd = toDay(date);
    if (isNaN(+wd) || wd >= localDate(new Date(), await this.tz(t))) throw new BadRequestException("Only completed past days can be finalized");
    const d = await this.daily(u, date), todo = d.rows.filter(r => !r.attendance);
    const r = await this.db.attendance.createMany({ skipDuplicates: true, data: todo.map(x => ({ tenantId: t, employeeId: x.employee.id, workDate: wd, status: (x.expected ?? "ABSENT") as any, method: "MANUAL" as const, note: "Auto-finalized" })) });
    await this.db.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "ATTENDANCE_FINALIZED", entity: date, meta: { created: r.count } } });
    return { created: r.count };
  }

  private async write(u: AuthUser, empId: string, branchId: string | null, workDate: string, f: { status: any; checkInAt?: Date; checkOutAt?: Date }, note: string, action: string) {
    const t = tenant(u), wd = toDay(workDate);
    if (isNaN(+wd) || wd > localDate(new Date(), await this.tz(t))) throw new BadRequestException("Invalid or future date");
    if (f.checkInAt && f.checkOutAt && f.checkOutAt <= f.checkInAt) throw new BadRequestException("Check-out must be after check-in");
    const where = { tenantId_employeeId_workDate: { tenantId: t, employeeId: empId, workDate: wd } };
    const before = await this.db.attendance.findUnique({ where });
    const data = { status: f.status, checkInAt: f.checkInAt, checkOutAt: f.checkOutAt, workMinutes: f.checkInAt && f.checkOutAt ? Math.round((+f.checkOutAt - +f.checkInAt) / 60000) : undefined, method: "MANUAL" as const, branchId, note };
    const rec = await this.db.attendance.upsert({ where, create: { tenantId: t, employeeId: empId, workDate: wd, ...data }, update: data });
    await this.db.auditLog.create({ data: { tenantId: t, actorId: u.sub, action, entity: rec.id, meta: json({ before, after: rec, note }) } });
    return rec;
  }
  async manual(u: AuthUser, d: any) {
    const e = await this.db.employee.findFirst({ where: { id: d.employeeId, ...scope(u) } }); if (!e) throw new NotFoundException("Employee not found");
    return this.write(u, e.id, e.branchId, d.workDate, { status: d.status, checkInAt: dOrU(d.checkInAt), checkOutAt: dOrU(d.checkOutAt) }, d.note, "ATTENDANCE_MANUAL_EDIT");
  }
  async bulk(u: AuthUser, d: any) {
    const emps = await this.db.employee.findMany({ where: { id: { in: d.employeeIds }, ...scope(u), status: "ACTIVE" } });
    for (const e of emps) await this.write(u, e.id, e.branchId, d.workDate, { status: d.status }, d.note, "ATTENDANCE_BULK_EDIT");
    return { updated: emps.length };
  }

  async createCorrection(u: AuthUser, d: any) {
    const e = await this.me(u), wd = toDay(d.workDate);
    if (isNaN(+wd) || wd > localDate(new Date(), await this.tz(e.tenantId))) throw new BadRequestException("Invalid or future date");
    if (await this.db.attendanceCorrection.count({ where: { tenantId: e.tenantId, employeeId: e.id, workDate: wd, status: "PENDING" } })) throw new BadRequestException("A request for this date is already pending");
    return this.db.attendanceCorrection.create({ data: { tenantId: e.tenantId, employeeId: e.id, workDate: wd, requestedStatus: d.requestedStatus, requestedIn: dOrU(d.requestedIn), requestedOut: dOrU(d.requestedOut), reason: d.reason } });
  }
  corrections(u: AuthUser, status?: string) {
    const where: any = { tenantId: tenant(u), ...(status ? { status } : {}) };
    where.employee = u.perms.includes("attendance:approve") ? restrict(u) : { userId: u.sub };
    return this.db.attendanceCorrection.findMany({ where, include: { employee: { select: { fullName: true, employeeCode: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  }
  async decide(u: AuthUser, id: string, approve: boolean, note?: string) {
    const c = await this.db.attendanceCorrection.findFirst({ where: { id, tenantId: tenant(u), employee: restrict(u) }, include: { employee: true } });
    if (!c) throw new NotFoundException();
    if (c.status !== "PENDING") throw new BadRequestException("Already reviewed");
    if (c.employee.userId === u.sub) throw new BadRequestException("You cannot review your own request");
    if (approve) await this.write(u, c.employeeId, c.employee.branchId, c.workDate.toISOString(), { status: c.requestedStatus ?? "PRESENT", checkInAt: c.requestedIn ?? undefined, checkOutAt: c.requestedOut ?? undefined }, `Correction: ${c.reason}`, "ATTENDANCE_CORRECTION_APPROVED");
    return this.db.attendanceCorrection.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", reviewedById: u.sub, reviewNote: note, reviewedAt: new Date() } });
  }

  // ==========================================
  // PUBLIC KIOSK TERMINAL METHODS (NO LOGIN NEEDED)
  // ==========================================

  async kioskConfig(branchId?: string) {
    let company: any = null;
    if (branchId) {
      const b = await this.db.branch.findUnique({ where: { id: branchId } });
      if (b) company = await this.db.company.findUnique({ where: { tenantId: b.tenantId } });
    }
    if (!company) {
      company = await this.db.company.findFirst({ orderBy: { createdAt: "asc" } });
    }
    if (!company) throw new NotFoundException("Company not configured");

    const branches = await this.db.branch.findMany({
      where: { tenantId: company.tenantId, isActive: true },
      select: { id: true, name: true, code: true, address: true },
      orderBy: { name: "asc" },
    });

    const totalEnrolled = await this.db.faceTemplate.count({
      where: { tenantId: company.tenantId, employee: { status: "ACTIVE" } },
    });

    return {
      tenantId: company.tenantId,
      companyName: company.name,
      logoUrl: company.logoUrl,
      timezone: company.timezone,
      serverTime: new Date().toISOString(),
      branches,
      totalEnrolled,
    };
  }

  kioskChallenge() {
    return this.face.kioskChallenge();
  }

  async kioskRecent(branchId?: string) {
    let tenantId: string | null = null;
    if (branchId) {
      const b = await this.db.branch.findUnique({ where: { id: branchId } });
      if (b) tenantId = b.tenantId;
    }
    if (!tenantId) {
      const c = await this.db.company.findFirst({ orderBy: { createdAt: "asc" } });
      tenantId = c?.tenantId ?? null;
    }
    if (!tenantId) return [];

    const logs = await this.db.attendanceLog.findMany({
      where: {
        tenantId,
        success: true,
        createdAt: { gte: new Date(Date.now() - 12 * 36e5) },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const empIds = logs.map((l) => l.employeeId).filter(Boolean) as string[];
    const emps = await this.db.employee.findMany({
      where: { id: { in: empIds } },
      select: { id: true, fullName: true, employeeCode: true, branch: { select: { name: true } }, designation: { select: { name: true } } },
    });
    const empMap = new Map(emps.map((e) => [e.id, e]));

    return logs.map((l) => {
      const emp = l.employeeId ? empMap.get(l.employeeId) : null;
      return {
        id: l.id,
        name: emp?.fullName || "Staff Member",
        code: emp?.employeeCode || "EMP",
        branch: emp?.branch?.name || "",
        designation: emp?.designation?.name || "",
        type: l.type,
        time: l.createdAt,
      };
    });
  }

  async kioskPunch(d: any, ip?: string, ua?: string) {
    if (!validVec(d.descriptor)) throw new BadRequestException("Invalid face biometric vector");

    // 1. Consume and verify anti-spoofing challenge nonce
    if (!this.face.consumeKiosk(d.challengeId)) {
      throw new BadRequestException("Biometric challenge expired or replayed. Please face the camera to refresh.");
    }

    // 2. Validate liveness / anti-spoof check
    if (!d.challengePassed) {
      throw new BadRequestException("Anti-Spoof Alert: Live human verification failed. Static photo or screen detected.");
    }

    // 3. Resolve tenant
    let tenantId = d.tenantId;
    if (!tenantId && d.branchId) {
      const b = await this.db.branch.findUnique({ where: { id: d.branchId } });
      if (b) tenantId = b.tenantId;
    }
    if (!tenantId) {
      const comp = await this.db.company.findFirst({ orderBy: { createdAt: "asc" } });
      if (!comp) throw new NotFoundException("Company not found");
      tenantId = comp.tenantId;
    }

    // 4. Fetch all enrolled templates for 1:N face identification
    const templates = await this.db.faceTemplate.findMany({
      where: { tenantId },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            status: true,
            branchId: true,
            branch: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!templates.length) {
      throw new BadRequestException("No employee face biometrics are enrolled for this company yet. Please register employee faces in Dashboard.");
    }

    // 5. 1:N Euclidean vector comparison
    let bestMatch: any = null;
    let minDistance = 999;
    for (const item of templates) {
      if (item.employee.status !== "ACTIVE") continue;
      try {
        const tVec = decryptVec(item.encTemplate);
        const dist = euclid(tVec, d.descriptor);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = item;
        }
      } catch {
        // ignore corrupted
      }
    }

    const MATCH_THRESHOLD = 0.50;
    if (!bestMatch || minDistance > MATCH_THRESHOLD) {
      return {
        ok: false,
        matched: false,
        distance: minDistance,
        reason: "Face not recognized. Please enroll your face with HR in Employees directory.",
      };
    }

    const emp = bestMatch.employee;
    const now = new Date();

    // 6. Double-punch debouncing (within 40 seconds)
    const recentLog = await this.db.attendanceLog.findFirst({
      where: {
        tenantId,
        employeeId: emp.id,
        createdAt: { gte: new Date(now.getTime() - 40000) },
        success: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentLog) {
      return {
        ok: true,
        matched: true,
        alreadyPunched: true,
        punchType: recentLog.type,
        time: recentLog.createdAt,
        message: `Attendance already recorded ${Math.round((now.getTime() - recentLog.createdAt.getTime()) / 1000)}s ago!`,
        employee: {
          id: emp.id,
          fullName: emp.fullName,
          employeeCode: emp.employeeCode,
          branch: emp.branch?.name,
          designation: emp.designation?.name,
        },
      };
    }

    // 7. Determine Punch Type (CHECK_IN vs CHECK_OUT)
    const tz = await this.tz(tenantId);
    let wd = localDate(now, tz);
    let punchType = d.type;

    // Check open check-in from last 20 hours
    const open = await this.db.attendance.findFirst({
      where: {
        tenantId,
        employeeId: emp.id,
        checkInAt: { gte: new Date(now.getTime() - 20 * 36e5) },
        checkOutAt: null,
      },
      orderBy: { checkInAt: "desc" },
    });

    if (!punchType || punchType === "AUTO") {
      punchType = open ? "CHECK_OUT" : "CHECK_IN";
    }

    let rec: any;
    let shiftInfo: any = null;

    if (punchType === "CHECK_IN") {
      if (open) {
        return {
          ok: true,
          matched: true,
          alreadyPunched: true,
          punchType: "CHECK_IN",
          time: open.checkInAt,
          message: "You are already checked in for today!",
          employee: {
            id: emp.id,
            fullName: emp.fullName,
            employeeCode: emp.employeeCode,
            branch: emp.branch?.name,
            designation: emp.designation?.name,
          },
        };
      }

      const win = await this.shifts.windowFor(emp, now, tz);
      if (win) {
        wd = win.workDate;
        shiftInfo = { name: win.shift.name, lateMinutes: win.lateMinutes };
      }

      const ex = await this.db.attendance.findUnique({
        where: { tenantId_employeeId_workDate: { tenantId, employeeId: emp.id, workDate: wd } },
      });

      const checkInData = {
        status: "PRESENT" as const,
        checkInAt: now,
        method: "FACE" as const,
        branchId: d.branchId || emp.branchId,
        shiftId: win?.shift.id ?? null,
        isLate: !!win && win.lateMinutes > 0,
        lateMinutes: win?.lateMinutes ?? 0,
        note: "Punched via Kiosk Terminal",
      };

      rec = ex
        ? await this.db.attendance.update({ where: { id: ex.id }, data: checkInData })
        : await this.db.attendance.create({ data: { tenantId, employeeId: emp.id, workDate: wd, ...checkInData } });
    } else {
      // CHECK_OUT
      if (!open) {
        const todayRec = await this.db.attendance.findUnique({
          where: { tenantId_employeeId_workDate: { tenantId, employeeId: emp.id, workDate: wd } },
        });
        if (!todayRec) {
          throw new BadRequestException("No active check-in found for today. Please Check In first.");
        }
        rec = await this.db.attendance.update({
          where: { id: todayRec.id },
          data: { checkOutAt: now, method: "FACE" as const },
        });
      } else {
        rec = await this.db.attendance.update({
          where: { id: open.id },
          data: await this.shifts.closeData(open, now, tz),
        });
      }
    }

    // Log punch
    await this.db.attendanceLog.create({
      data: {
        tenantId,
        employeeId: emp.id,
        type: punchType,
        method: "FACE",
        success: true,
        deviceInfo: "Office Face Kiosk Terminal",
        ip,
        matchDistance: minDistance,
        attendanceId: rec.id,
      },
    });

    return {
      ok: true,
      matched: true,
      punchType,
      time: now,
      matchDistance: minDistance,
      workMinutes: rec.workMinutes,
      shiftInfo,
      message: punchType === "CHECK_IN" ? "Checked in successfully! Have a great day!" : "Checked out successfully! Have a safe trip home!",
      employee: {
        id: emp.id,
        fullName: emp.fullName,
        employeeCode: emp.employeeCode,
        branch: emp.branch?.name,
        department: emp.department?.name,
        designation: emp.designation?.name,
      },
    };
  }

  async exportAttendance(u: AuthUser, q: any) {
    const t = tenant(u);
    let fromDate: Date;
    let toDate: Date;

    if (q.month && /^\d{4}-\d{2}$/.test(q.month)) {
      fromDate = toDay(q.month + "-01");
      const nextMonth = new Date(Date.UTC(+q.month.slice(0, 4), +q.month.slice(5, 7), 1));
      toDate = new Date(nextMonth.getTime() - 864e5);
    } else {
      fromDate = q.from ? toDay(q.from) : toDay(new Date().toISOString().slice(0, 8) + "01");
      toDate = q.to ? toDay(q.to) : toDay(new Date().toISOString().slice(0, 10));
    }

    const whereClause: any = {
      tenantId: t,
      workDate: { gte: fromDate, lte: toDate },
    };

    if (q.status && q.status !== "ALL") {
      whereClause.status = q.status;
    }

    const empFilter: any = { ...scope(u) };
    if (q.branchId) empFilter.branchId = q.branchId;
    if (q.departmentId) empFilter.departmentId = q.departmentId;

    const records = await this.db.attendance.findMany({
      where: {
        ...whereClause,
        employee: empFilter,
      },
      include: {
        employee: {
          select: {
            fullName: true,
            employeeCode: true,
            branch: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        shift: {
          select: {
            name: true,
            code: true,
            startMinute: true,
            endMinute: true,
          },
        },
      },
      orderBy: [{ workDate: "desc" }, { employee: { fullName: "asc" } }],
      take: 5000,
    });

    const fmtMin = (m?: number | null) => {
      if (m == null) return "—";
      return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    };

    const fmtTime = (d?: Date | null) => {
      if (!d) return "—";
      return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    };

    const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const headers = [
      "S.No",
      "Employee Code",
      "Employee Name",
      "Branch",
      "Department",
      "Date",
      "Day",
      "Shift Name",
      "Scheduled Window",
      "Clock In Time",
      "Clock Out Time",
      "Work Duration (Hours)",
      "Attendance Status",
      "Late Arrival (Mins)",
      "Overtime (Mins)",
      "Punch Method",
      "Notes / Remarks",
    ];

    const rows = records.map((r, idx) => {
      const dateStr = r.workDate.toISOString().slice(0, 10);
      const dayName = DOW[new Date(r.workDate).getUTCDay()];
      const shiftWindow = r.shift
        ? `${fmtMin(r.shift.startMinute)} - ${fmtMin(r.shift.endMinute)}`
        : "General";
      const workHours = r.workMinutes != null ? (r.workMinutes / 60).toFixed(2) : "—";

      return [
        idx + 1,
        r.employee?.employeeCode || "—",
        r.employee?.fullName || "—",
        r.employee?.branch?.name || "All Branches",
        r.employee?.department?.name || "General",
        dateStr,
        dayName,
        r.shift?.name || "Default Shift",
        shiftWindow,
        fmtTime(r.checkInAt),
        fmtTime(r.checkOutAt),
        workHours,
        r.status,
        r.lateMinutes || 0,
        r.overtimeMinutes || 0,
        r.method,
        r.note || "—",
      ];
    });

    return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  }
}
