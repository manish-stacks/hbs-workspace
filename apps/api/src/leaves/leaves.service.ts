import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { scope } from "../hr/scope";
import { localDate, toDay } from "../attendance/util";
import { ShiftService } from "../shifts/shifts.service";
import { NotificationService } from "../celebrations/infra";
import { DEFAULT_LEAVE_TYPES, carryAmount, remaining, resolveQuota } from "./leave.logic";

const tenant = (u: AuthUser) => scope({ ...u, branchId: null, departmentId: null }).tenantId;
const restrict = (u: AuthUser) => { const { tenantId, ...r } = scope(u); return r; };
const addDays = (d: Date, n: number) => new Date(+d + n * 864e5);
const view = (b: any) => ({ ...b, allocated: +b.allocated, carriedForward: +b.carriedForward, used: +b.used, pending: +b.pending, encashed: +b.encashed, remaining: remaining(b) });

@Injectable()
export class LeaveService {
  constructor(private db: PrismaService, private shifts: ShiftService, private notes: NotificationService) {}
  private async tz(t: string) { return (await this.db.company.findUnique({ where: { tenantId: t } }))?.timezone ?? "Asia/Kolkata"; }
  private async meOrFail(u: AuthUser) { const e = await this.db.employee.findFirst({ where: { userId: u.sub, tenantId: tenant(u), status: "ACTIVE" } }); if (!e) throw new BadRequestException("No employee profile is linked to your login"); return e; }

  // ---- types & policies ----
  types(u: AuthUser, all = false) { return this.db.leaveType.findMany({ where: { tenantId: tenant(u), ...(all ? {} : { isActive: true }) }, orderBy: { name: "asc" } }); }
  async addType(u: AuthUser, d: any) { return this.db.leaveType.create({ data: { ...d, tenantId: tenant(u) } }); }
  async editType(u: AuthUser, id: string, d: any) { const r = await this.db.leaveType.updateMany({ where: { id, tenantId: tenant(u) }, data: d }); if (!r.count) throw new NotFoundException(); return { ok: true }; }
  async defaults(u: AuthUser) { const r = await this.db.leaveType.createMany({ skipDuplicates: true, data: DEFAULT_LEAVE_TYPES.map(x => ({ ...x, tenantId: tenant(u) })) }); return { created: r.count }; }
  policies(u: AuthUser) { return this.db.leavePolicy.findMany({ where: { tenantId: tenant(u) }, include: { leaveType: { select: { name: true } } } }); }
  async addPolicy(u: AuthUser, d: any) {
    const t = tenant(u); if (!(await this.db.leaveType.count({ where: { id: d.leaveTypeId, tenantId: t } }))) throw new BadRequestException("Invalid leave type");
    for (const [k, m] of [["branchId", "branch"], ["departmentId", "department"]] as const) if (d[k] && !(await (this.db as any)[m].count({ where: { id: d[k], tenantId: t } }))) throw new BadRequestException(`Invalid ${k}`);
    return this.db.leavePolicy.create({ data: { ...d, tenantId: t } });
  }
  async delPolicy(u: AuthUser, id: string) { const r = await this.db.leavePolicy.deleteMany({ where: { id, tenantId: tenant(u) } }); if (!r.count) throw new NotFoundException(); return { ok: true }; }

  // ---- balances ----
  private async ensure(emp: any, type: any, year: number) {
    const pol = await this.db.leavePolicy.findMany({ where: { tenantId: emp.tenantId, leaveTypeId: type.id } });
    return this.db.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: type.id, year } }, update: {},
      create: { tenantId: emp.tenantId, employeeId: emp.id, leaveTypeId: type.id, year, allocated: resolveQuota(type, pol, emp) } });
  }
  async balancesFor(emp: any, year: number) {
    const types = await this.db.leaveType.findMany({ where: { tenantId: emp.tenantId, isActive: true } }), out = [];
    for (const t of types) { if (t.genderRestriction && t.genderRestriction !== emp.gender) continue; out.push({ ...view(await this.ensure(emp, t, year)), leaveType: { id: t.id, name: t.name, code: t.code, isPaid: t.isPaid } }); }
    return out;
  }
  async myBalances(u: AuthUser, year?: string) { return this.balancesFor(await this.meOrFail(u), +(year ?? new Date().getFullYear())); }
  async balances(u: AuthUser, employeeId: string, year?: string) {
    const emp = await this.db.employee.findFirst({ where: { id: employeeId, ...scope(u) } }); if (!emp) throw new NotFoundException("Employee not found");
    return this.balancesFor(emp, +(year ?? new Date().getFullYear()));
  }
  async allocate(u: AuthUser, year: number, ids?: string[]) {
    const emps = await this.db.employee.findMany({ where: { ...scope(u), status: "ACTIVE", ...(ids?.length ? { id: { in: ids } } : {}) }, take: 2000 }), types = await this.db.leaveType.findMany({ where: { tenantId: tenant(u), isActive: true } });
    let n = 0; for (const e of emps) for (const t of types) if (!t.genderRestriction || t.genderRestriction === e.gender) { await this.ensure(e, t, year); n++; }
    return { balances: n };
  }
  async carryForward(u: AuthUser, fromYear: number) {
    const t = tenant(u), rows = await this.db.leaveBalance.findMany({ where: { tenantId: t, year: fromYear, employee: { ...restrict(u), status: "ACTIVE" }, leaveType: { carryForwardMax: { gt: 0 } } }, include: { employee: true, leaveType: true } });
    let n = 0;
    for (const r of rows) { const c = carryAmount(r, r.leaveType.carryForwardMax); if (c <= 0) continue; await this.ensure(r.employee, r.leaveType, fromYear + 1);
      await this.db.leaveBalance.update({ where: { employeeId_leaveTypeId_year: { employeeId: r.employeeId, leaveTypeId: r.leaveTypeId, year: fromYear + 1 } }, data: { carriedForward: c } }); n++; }
    await this.db.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "LEAVE_CARRY_FORWARD", meta: { fromYear, updated: n } } });
    return { updated: n };
  }
  async encash(u: AuthUser, d: any) {
    const emp = await this.db.employee.findFirst({ where: { id: d.employeeId, ...scope(u) } }), type = await this.db.leaveType.findFirst({ where: { id: d.leaveTypeId, tenantId: tenant(u), encashable: true } });
    if (!emp || !type) throw new BadRequestException("Employee or encashable leave type not found");
    const b = await this.ensure(emp, type, d.year); if (d.days > remaining(b)) throw new BadRequestException(`Only ${remaining(b)} days available`);
    await this.db.leaveBalance.update({ where: { id: b.id }, data: { encashed: { increment: d.days } } });
    await this.db.auditLog.create({ data: { tenantId: emp.tenantId, actorId: u.sub, action: "LEAVE_ENCASHED", entity: emp.id, meta: { type: type.code, days: d.days, year: d.year } } });
    return { ok: true };
  }

  // ---- applications ----
  /** Working days only: holidays and weekly offs inside the range are not charged. */
  private async calc(emp: any, from: Date, to: Date, half: boolean) {
    const n = Math.round((+to - +from) / 864e5) + 1; if (n < 1 || n > 90) throw new BadRequestException("Leave range must be 1–90 days");
    if (half && n !== 1) throw new BadRequestException("Half-day leave must be a single day");
    const counted: Date[] = [];
    for (let i = 0; i < n; i++) { const d = addDays(from, i), r = (await this.shifts.bulkResolve(emp.tenantId, d, [emp])).get(emp.id)!; if (!r.weekOff && !r.holiday) counted.push(d); }
    if (!counted.length) throw new BadRequestException("Selected dates are all holidays or weekly offs");
    return { days: half ? 0.5 : counted.length, counted };
  }
  async apply(u: AuthUser, d: any) {
    const emp = await this.meOrFail(u), t = emp.tenantId, type = await this.db.leaveType.findFirst({ where: { id: d.leaveTypeId, tenantId: t, isActive: true } });
    if (!type) throw new BadRequestException("Invalid leave type");
    if (type.genderRestriction && type.genderRestriction !== emp.gender) throw new BadRequestException("This leave type is not applicable to you");
    if (d.isHalfDay && !type.allowHalfDay) throw new BadRequestException("Half-day is not allowed for this leave type");
    const from = toDay(d.fromDate), to = toDay(d.toDate), today = localDate(new Date(), await this.tz(t));
    if (isNaN(+from) || isNaN(+to) || to < from) throw new BadRequestException("Invalid dates");
    if (from < today && (!d.isEmergency || from < addDays(today, -30))) throw new BadRequestException("Past dates need the Emergency option (max 30 days back)");
    if (await this.db.leaveApplication.count({ where: { employeeId: emp.id, status: { in: ["PENDING", "APPROVED"] }, fromDate: { lte: to }, toDate: { gte: from } } })) throw new BadRequestException("You already have leave overlapping these dates");
    const { days } = await this.calc(emp, from, to, !!d.isHalfDay), year = from.getUTCFullYear(), bal = await this.ensure(emp, type, year);
    if (type.isPaid && days > remaining(bal)) throw new BadRequestException(`Insufficient ${type.name} balance (${remaining(bal)} left)`);
    return this.db.$transaction(async tx => {
      const a = await tx.leaveApplication.create({ data: { tenantId: t, employeeId: emp.id, leaveTypeId: type.id, fromDate: from, toDate: to, isHalfDay: !!d.isHalfDay, isEmergency: !!d.isEmergency, days, reason: d.reason } });
      await tx.leaveBalance.update({ where: { id: bal.id }, data: { pending: { increment: days } } }); return a;
    });
  }
  async mine(u: AuthUser) { const e = await this.meOrFail(u); return this.db.leaveApplication.findMany({ where: { employeeId: e.id }, include: { leaveType: { select: { name: true, code: true } }, approvals: true }, orderBy: { createdAt: "desc" }, take: 100 }); }
  list(u: AuthUser, q: any) {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    return this.db.leaveApplication.findMany({ where: { tenantId: tenant(u), employee: restrict(u), ...(q.status ? { status: q.status } : {}), ...(q.upcoming ? { toDate: { gte: today } } : {}) },
      include: { employee: { select: { fullName: true, employeeCode: true } }, leaveType: { select: { name: true, code: true, approvalLevels: true } }, approvals: true }, orderBy: q.upcoming ? { fromDate: "asc" } : { createdAt: "desc" }, take: 300 });
  }
  private async bal(a: any, tx: any) { return tx.leaveBalance.findFirst({ where: { employeeId: a.employeeId, leaveTypeId: a.leaveTypeId, year: a.fromDate.getUTCFullYear() } }); }
  async decide(u: AuthUser, id: string, approve: boolean, note?: string) {
    const t = tenant(u), a = await this.db.leaveApplication.findFirst({ where: { id, tenantId: t, status: "PENDING", employee: restrict(u) }, include: { employee: true, leaveType: true } });
    if (!a) throw new NotFoundException("Application not found or already decided");
    if (a.employee.userId === u.sub) throw new ForbiddenException("You cannot decide your own leave");
    if (a.currentLevel >= 2 && !u.perms.includes("leave:manage")) throw new ForbiddenException("Second-level approval needs HR (leave:manage)");
    await this.db.$transaction(async tx => {
      await tx.leaveApproval.create({ data: { applicationId: id, level: a.currentLevel, approverId: u.sub, decision: approve ? "APPROVED" : "REJECTED", note } });
      const b = await this.bal(a, tx);
      if (!approve) { await tx.leaveApplication.update({ where: { id }, data: { status: "REJECTED" } }); if (b) await tx.leaveBalance.update({ where: { id: b.id }, data: { pending: { decrement: a.days } } }); }
      else if (a.currentLevel < a.leaveType.approvalLevels) await tx.leaveApplication.update({ where: { id }, data: { currentLevel: a.currentLevel + 1 } });
      else {
        await tx.leaveApplication.update({ where: { id }, data: { status: "APPROVED" } });
        if (b) await tx.leaveBalance.update({ where: { id: b.id }, data: { pending: { decrement: a.days }, used: { increment: a.days } } });
        if (!a.isHalfDay) {   // mark full-day leave on attendance
          const { counted } = await this.calc(a.employee, a.fromDate, a.toDate, false), note2 = `Leave: ${a.leaveType.name}`;
          await tx.attendance.updateMany({ where: { tenantId: t, employeeId: a.employeeId, workDate: { in: counted }, checkInAt: null }, data: { status: "ON_LEAVE", note: note2 } });
          await tx.attendance.createMany({ skipDuplicates: true, data: counted.map(d => ({ tenantId: t, employeeId: a.employeeId, workDate: d, status: "ON_LEAVE" as const, method: "MANUAL" as const, note: note2 })) });
        }
      }
      await tx.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: approve ? "LEAVE_APPROVED" : "LEAVE_REJECTED", entity: id, meta: { level: a.currentLevel, note } } });
    });
    if (a.employee.userId && (!approve || a.currentLevel >= a.leaveType.approvalLevels)) await this.notes.notify(t, [a.employee.userId], { type: "LEAVE", title: `Leave ${approve ? "approved" : "rejected"}`, body: `${a.leaveType.name}: ${a.fromDate.toISOString().slice(0, 10)} to ${a.toDate.toISOString().slice(0, 10)}${note ? ` — ${note}` : ""}`, link: "/employee/leaves" });
    return { ok: true };
  }
  async cancel(u: AuthUser, id: string) {
    const t = tenant(u), a = await this.db.leaveApplication.findFirst({ where: { id, tenantId: t, status: { in: ["PENDING", "APPROVED"] } }, include: { employee: true } });
    if (!a) throw new NotFoundException();
    const own = a.employee.userId === u.sub; if (!own && !(u.perms.includes("leave:manage") && (await this.db.employee.count({ where: { id: a.employeeId, ...scope(u) } })))) throw new ForbiddenException();
    if (a.status === "APPROVED" && a.fromDate < localDate(new Date(), await this.tz(t))) throw new BadRequestException("Leave that has already started cannot be cancelled");
    await this.db.$transaction(async tx => {
      const b = await this.bal(a, tx);
      if (b) await tx.leaveBalance.update({ where: { id: b.id }, data: a.status === "PENDING" ? { pending: { decrement: a.days } } : { used: { decrement: a.days } } });
      if (a.status === "APPROVED") await tx.attendance.deleteMany({ where: { tenantId: t, employeeId: a.employeeId, status: "ON_LEAVE", checkInAt: null, note: { startsWith: "Leave:" }, workDate: { gte: a.fromDate, lte: a.toDate } } });
      await tx.leaveApplication.update({ where: { id }, data: { status: "CANCELLED" } });
      await tx.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "LEAVE_CANCELLED", entity: id } });
    });
    return { ok: true };
  }
  /** Approved unpaid-leave days starting in a month (YYYY-MM) — consumed by payroll in Phase 7. */
  async lwp(u: AuthUser, month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException("month=YYYY-MM required");
    const from = toDay(month + "-01"), to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
    const rows = await this.db.leaveApplication.findMany({ where: { tenantId: tenant(u), employee: restrict(u), status: "APPROVED", fromDate: { gte: from, lt: to }, leaveType: { isPaid: false } }, select: { employeeId: true, days: true } });
    const m = new Map<string, number>(); for (const r of rows) m.set(r.employeeId, (m.get(r.employeeId) ?? 0) + Number(r.days));
    return [...m].map(([employeeId, days]) => ({ employeeId, days }));
  }
}
