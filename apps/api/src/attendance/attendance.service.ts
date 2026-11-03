import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { scope } from "../hr/scope";
import { FaceService } from "./face.service";
import { haversine, localDate, toDay } from "./util";

const tenant = (u: AuthUser) => scope({ ...u, branchId: null, departmentId: null }).tenantId;
const restrict = (u: AuthUser) => { const { tenantId, ...r } = scope(u); return r; };
const json = (x: any) => JSON.parse(JSON.stringify(x));
const dOrU = (s?: string) => (s ? new Date(s) : undefined);

@Injectable()
export class AttendanceService {
  constructor(private db: PrismaService, private face: FaceService) {}
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
    const wd = localDate(now, await this.tz(t)); let rec;
    try {
      if (d.type === "CHECK_IN") {
        const ex = await this.db.attendance.findUnique({ where: { tenantId_employeeId_workDate: { tenantId: t, employeeId: emp.id, workDate: wd } } });
        if (ex?.checkInAt) return fail("You have already checked in today");
        const data = { status: "PRESENT" as const, checkInAt: now, method: d.method, branchId: emp.branchId };
        rec = ex ? await this.db.attendance.update({ where: { id: ex.id }, data }) : await this.db.attendance.create({ data: { tenantId: t, employeeId: emp.id, workDate: wd, ...data } });
      } else {   // overnight-safe: close the latest open check-in from the last 20h
        const open = await this.db.attendance.findFirst({ where: { tenantId: t, employeeId: emp.id, checkInAt: { gte: new Date(now.getTime() - 20 * 36e5) }, checkOutAt: null }, orderBy: { checkInAt: "desc" } });
        if (!open) return fail("No open check-in found");
        const mins = Math.round((+now - +open.checkInAt!) / 60000);
        rec = await this.db.attendance.update({ where: { id: open.id }, data: { checkOutAt: now, workMinutes: mins, ...(["PRESENT", "HALF_DAY"].includes(open.status) ? { status: mins < 240 ? "HALF_DAY" : "PRESENT" } : {}) } });
      }
    } catch (e: any) { if (e.code === "P2002") return fail("You have already checked in today"); throw e; }
    await log(true, undefined, { ...extra, attendanceId: rec.id });
    return rec;
  }

  async daily(u: AuthUser, date: string) {
    const t = tenant(u), wd = toDay(date || new Date().toISOString());
    if (isNaN(+wd)) throw new BadRequestException("Invalid date");
    const emps = await this.db.employee.findMany({ where: { ...scope(u), status: "ACTIVE", joiningDate: { lte: wd } }, orderBy: { fullName: "asc" }, take: 1000,
      select: { id: true, fullName: true, employeeCode: true, branch: { select: { name: true } }, department: { select: { name: true } }, faceTemplate: { select: { id: true } } } });
    const recs = await this.db.attendance.findMany({ where: { tenantId: t, workDate: wd, employeeId: { in: emps.map(e => e.id) } } });
    const map = new Map(recs.map(r => [r.employeeId, r]));
    const rows = emps.map(e => ({ employee: { id: e.id, fullName: e.fullName, employeeCode: e.employeeCode, branch: e.branch?.name, department: e.department?.name, faceEnrolled: !!e.faceTemplate }, attendance: map.get(e.id) ?? null }));
    const c = (s: string) => rows.filter(r => r.attendance?.status === s).length;
    return { date: wd.toISOString().slice(0, 10), summary: { total: rows.length, present: c("PRESENT"), halfDay: c("HALF_DAY"), absent: c("ABSENT"), onLeave: c("ON_LEAVE"), weeklyOff: c("WEEKLY_OFF"), holiday: c("HOLIDAY"), notMarked: rows.filter(r => !r.attendance).length }, rows };
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
}
