import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { scope } from "../hr/scope";
import { localDate, toDay, zonedToUtc } from "../attendance/util";
import { closeCalc, lateMinutes, shiftTimes } from "./shift.logic";

const tenant = (u: AuthUser) => scope({ ...u, branchId: null, departmentId: null }).tenantId;
const restrict = (u: AuthUser) => { const { tenantId, ...r } = scope(u); return r; };
const hm = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(+d + n * 864e5);
const build = (d: any) => {
  const o: any = {};
  for (const k of ["name", "code", "type", "breakMinutes", "graceMinutes", "earlyOutGraceMinutes", "minWorkMinutes", "overtimeEnabled", "overtimeAfterMinutes", "branchId", "departmentId", "isActive"]) if (d[k] !== undefined) o[k] = d[k];
  if (d.startTime) o.startMinute = hm(d.startTime); if (d.endTime) o.endMinute = hm(d.endTime);
  if (d.weeklyOffDays) o.weeklyOffDays = d.weeklyOffDays.join(","); if (d.effectiveFrom) o.effectiveFrom = toDay(d.effectiveFrom);
  return o;
};
type E = { id: string; branchId: string | null; departmentId: string | null };

@Injectable()
export class ShiftService {
  constructor(private db: PrismaService) {}
  private async tz(t: string) { return (await this.db.company.findUnique({ where: { tenantId: t } }))?.timezone ?? "Asia/Kolkata"; }
  private async me(u: AuthUser) { const e = await this.db.employee.findFirst({ where: { userId: u.sub, tenantId: tenant(u), status: "ACTIVE" } }); return e; }
  private async meOrFail(u: AuthUser) { const e = await this.me(u); if (!e) throw new BadRequestException("No employee profile is linked to your login"); return e; }
  private async refs(t: string, d: any) {
    for (const [k, m] of [["branchId", "branch"], ["departmentId", "department"]] as const) if (d[k] && !(await (this.db as any)[m].count({ where: { id: d[k], tenantId: t } }))) throw new BadRequestException(`Invalid ${k}`);
  }

  /** Effective shift / weekly-off / holiday for many employees on one local date. Priority: roster override > assignment (temporary first, newest first). */
  async bulkResolve(t: string, day: Date, emps: E[]) {
    const ids = emps.map(e => e.id);
    const [shifts, scheds, assigns, hols] = await Promise.all([
      this.db.shift.findMany({ where: { tenantId: t, isActive: true, effectiveFrom: { lte: day } } }),
      this.db.shiftSchedule.findMany({ where: { tenantId: t, date: day, employeeId: { in: ids } } }),
      this.db.shiftAssignment.findMany({ where: { tenantId: t, employeeId: { in: ids }, fromDate: { lte: day }, OR: [{ toDate: null }, { toDate: { gte: day } }] }, orderBy: [{ isTemporary: "desc" }, { fromDate: "desc" }] }),
      this.db.holiday.findMany({ where: { tenantId: t, date: day, type: "COMPANY" } }) ]);
    const sm = new Map(shifts.map(s => [s.id, s])), sc = new Map(scheds.map(x => [x.employeeId, x])), asg = new Map<string, any>();
    for (const a of assigns) if (!asg.has(a.employeeId)) asg.set(a.employeeId, a);
    const dow = String(day.getUTCDay());
    return new Map(emps.map(e => {
      const s = sc.get(e.id); let shift: any = null, weekOff = false;
      if (s) { if (s.shiftId) shift = sm.get(s.shiftId) ?? null; else weekOff = true; }
      else { const a = asg.get(e.id); shift = a ? sm.get(a.shiftId) ?? null : null; if (shift && shift.weeklyOffDays.split(",").includes(dow)) { weekOff = true; shift = null; } }
      const holiday = hols.find(h => (!h.branchId || h.branchId === e.branchId) && (!h.departmentId || h.departmentId === e.departmentId)) ?? null;
      return [e.id, { shift, weekOff, holiday }] as const;
    }));
  }

  /** Which shift does a punch at `now` belong to? Looks at today's and yesterday's shift so overnight work stays on ONE work date. */
  async windowFor(emp: E & { tenantId: string }, now: Date, tz: string) {
    const D = localDate(now, tz); let best: any = null;
    for (const date of [D, addDays(D, -1)]) {
      const s = (await this.bulkResolve(emp.tenantId, date, [emp])).get(emp.id)!.shift; if (!s) continue;
      if (s.type === "FLEXIBLE") { if (+date === +D && !best) best = { shift: s, workDate: date, lateMinutes: 0, diff: 1e15 }; continue; }
      const { start, end } = shiftTimes(date, s, tz);
      if (+now < +start - 180 * 6e4 || +now > +end + 180 * 6e4) continue;
      const diff = Math.abs(+now - +start);
      if (!best || diff < best.diff) best = { shift: s, workDate: date, lateMinutes: lateMinutes(now, start, s.graceMinutes), diff };
    }
    return best;
  }
  async closeData(open: any, now: Date, tz: string) {
    const s = open.shiftId ? await this.db.shift.findUnique({ where: { id: open.shiftId } }) : null, c = closeCalc(s, open.workDate, open.checkInAt, now, tz);
    return { checkOutAt: now, workMinutes: c.workMinutes, isEarlyOut: c.isEarlyOut, overtimeMinutes: c.overtimeMinutes, ...(["PRESENT", "HALF_DAY"].includes(open.status) ? { status: c.status as any } : {}) };
  }

  // ---------- shifts ----------
  list(u: AuthUser) { return this.db.shift.findMany({ where: { tenantId: tenant(u) }, orderBy: { name: "asc" } }); }
  async create(u: AuthUser, d: any) {
    const t = tenant(u); await this.refs(t, d);
    const s = await this.db.shift.create({ data: { ...build(d), tenantId: t, effectiveFrom: toDay(d.effectiveFrom ?? new Date().toISOString()) } });
    await this.db.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "SHIFT_CREATED", entity: s.id } }); return s;
  }
  async update(u: AuthUser, id: string, d: any) {
    const t = tenant(u); await this.refs(t, d);
    const r = await this.db.shift.updateMany({ where: { id, tenantId: t }, data: build(d) }); if (!r.count) throw new NotFoundException();
    await this.db.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "SHIFT_UPDATED", entity: id } }); return { ok: true };
  }

  // ---------- assignment & rotation ----------
  async assign(u: AuthUser, d: any) {
    const t = tenant(u), shift = await this.db.shift.findFirst({ where: { id: d.shiftId, tenantId: t, isActive: true } }); if (!shift) throw new NotFoundException("Shift not found");
    const from = toDay(d.fromDate), to = d.toDate ? toDay(d.toDate) : null; if (to && to < from) throw new BadRequestException("End date is before start date");
    const f: any[] = []; if (d.employeeIds?.length) f.push({ id: { in: d.employeeIds } }); if (d.departmentId) f.push({ departmentId: d.departmentId }); if (d.branchId) f.push({ branchId: d.branchId });
    if (!f.length) throw new BadRequestException("Select employees, a department or a branch");
    const emps = await this.db.employee.findMany({ where: { ...scope(u), status: "ACTIVE", AND: f }, take: 1000 });
    const ok = emps.filter(e => !((shift.branchId && shift.branchId !== e.branchId) || (shift.departmentId && shift.departmentId !== e.departmentId)));
    await this.db.shiftAssignment.createMany({ data: ok.map(e => ({ tenantId: t, employeeId: e.id, shiftId: shift.id, fromDate: from, toDate: to, isTemporary: !!d.isTemporary, createdById: u.sub })) });
    await this.db.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "SHIFT_ASSIGNED", entity: shift.id, meta: { employees: ok.length, from: d.fromDate, to: d.toDate ?? null } } });
    return { assigned: ok.length, skipped: emps.filter(e => !ok.includes(e)).map(e => e.fullName) };
  }
  assignments(u: AuthUser, employeeId?: string) {
    return this.db.shiftAssignment.findMany({ where: { tenantId: tenant(u), employee: restrict(u), ...(employeeId ? { employeeId } : {}) }, include: { shift: { select: { name: true, code: true } }, employee: { select: { fullName: true, employeeCode: true } } }, orderBy: { fromDate: "desc" }, take: 200 });
  }
  async removeAssignment(u: AuthUser, id: string) {
    const r = await this.db.shiftAssignment.deleteMany({ where: { id, tenantId: tenant(u), employee: restrict(u) } }); if (!r.count) throw new NotFoundException(); return { ok: true };
  }
  async rotation(u: AuthUser, d: any) {
    const t = tenant(u), pattern: (string | null)[] = d.pattern;
    if (!pattern.length || pattern.length > 14) throw new BadRequestException("Pattern must have 1-14 entries");
    const sids = [...new Set(pattern.filter(Boolean))] as string[];
    if (sids.length && (await this.db.shift.count({ where: { id: { in: sids }, tenantId: t, isActive: true } })) !== sids.length) throw new BadRequestException("Invalid shift in pattern");
    const emps = await this.db.employee.findMany({ where: { id: { in: d.employeeIds }, ...scope(u), status: "ACTIVE" } }), from = toDay(d.startDate), n = Math.min(d.days, 62);
    const data = emps.flatMap((e, i) => Array.from({ length: n }, (_, k) => ({ tenantId: t, employeeId: e.id, date: addDays(from, k), shiftId: pattern[(k + (d.stagger ? i : 0)) % pattern.length] })));
    await this.db.$transaction([this.db.shiftSchedule.deleteMany({ where: { tenantId: t, employeeId: { in: emps.map(e => e.id) }, date: { gte: from, lte: addDays(from, n - 1) } } }), this.db.shiftSchedule.createMany({ data })]);
    await this.db.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "ROTATION_CREATED", meta: { employees: emps.length, days: n } } });
    return { employees: emps.length, days: n };
  }

  // ---------- views ----------
  async roster(u: AuthUser, q: any) {
    const t = tenant(u), from = toDay(q.from || new Date().toISOString()), n = Math.min(Math.max(+q.days || 14, 1), 42);
    const f: any[] = []; if (q.branchId) f.push({ branchId: q.branchId }); if (q.departmentId) f.push({ departmentId: q.departmentId });
    const emps = await this.db.employee.findMany({ where: { ...scope(u), status: "ACTIVE", AND: f }, orderBy: { fullName: "asc" }, take: 300, select: { id: true, fullName: true, employeeCode: true, branchId: true, departmentId: true } });
    const days = Array.from({ length: n }, (_, k) => addDays(from, k)), per = await Promise.all(days.map(d => this.bulkResolve(t, d, emps)));
    return { days: days.map(d => d.toISOString().slice(0, 10)), rows: emps.map(e => ({ employee: { id: e.id, fullName: e.fullName, employeeCode: e.employeeCode },
      cells: per.map(m => { const r = m.get(e.id)!; return { code: r.shift?.code ?? null, weekOff: r.weekOff, holiday: r.holiday?.name ?? null }; }) })) };
  }
  async mine(u: AuthUser, q: any) {
    const e = await this.meOrFail(u), t = e.tenantId, from = toDay(q.from || new Date().toISOString()), n = Math.min(+q.days || 14, 31);
    const out = [];
    for (let k = 0; k < n; k++) { const d = addDays(from, k), r = (await this.bulkResolve(t, d, [e])).get(e.id)!;
      out.push({ date: d.toISOString().slice(0, 10), shift: r.shift ? { name: r.shift.name, code: r.shift.code, start: fmt(r.shift.startMinute), end: fmt(r.shift.endMinute) } : null, weekOff: r.weekOff, holiday: r.holiday?.name ?? null }); }
    return out;
  }
  async colleagues(u: AuthUser) {
    const e = await this.meOrFail(u);
    return this.db.employee.findMany({ where: { tenantId: e.tenantId, status: "ACTIVE", id: { not: e.id }, ...(e.branchId ? { branchId: e.branchId } : {}) }, select: { id: true, fullName: true, employeeCode: true }, orderBy: { fullName: "asc" }, take: 200 });
  }
  async reports(u: AuthUser, q: any) {
    const t = tenant(u), to = toDay(q.to || new Date().toISOString()), from = toDay(q.from || addDays(to, -30).toISOString());
    const f: any[] = [restrict(u)]; if (q.branchId) f.push({ branchId: q.branchId }); if (q.departmentId) f.push({ departmentId: q.departmentId });
    const where: any = { tenantId: t, workDate: { gte: from, lte: to }, employee: { AND: f }, ...(q.shiftId ? { shiftId: q.shiftId } : {}) };
    if (q.type === "late") where.isLate = true; else if (q.type === "early") where.isEarlyOut = true; else if (q.type === "overtime") where.overtimeMinutes = { gt: 0 }; else if (q.type === "absent") where.status = "ABSENT";
    const rows = await this.db.attendance.findMany({ where, include: { employee: { select: { fullName: true, employeeCode: true } }, shift: { select: { name: true, code: true } } }, orderBy: { workDate: "desc" }, take: 5000 });
    if (q.type !== "summary") return { type: q.type, rows };
    const g = new Map<string, any>();
    for (const r of rows) { const k = r.shift?.code ?? "—"; const x = g.get(k) ?? { shift: r.shift?.name ?? "No shift", code: k, records: 0, present: 0, late: 0, earlyOut: 0, overtimeMinutes: 0, workMinutes: 0 };
      x.records++; if (r.status === "PRESENT" || r.status === "HALF_DAY") x.present++; if (r.isLate) x.late++; if (r.isEarlyOut) x.earlyOut++; x.overtimeMinutes += r.overtimeMinutes; x.workMinutes += r.workMinutes ?? 0; g.set(k, x); }
    return { type: "summary", rows: [...g.values()] };
  }

  // ---------- swaps ----------
  async createSwap(u: AuthUser, d: any) {
    const me = await this.meOrFail(u), day = toDay(d.date);
    if (isNaN(+day) || day < localDate(new Date(), await this.tz(me.tenantId))) throw new BadRequestException("Choose today or a future date");
    const target = await this.db.employee.findFirst({ where: { id: d.targetId, tenantId: me.tenantId, status: "ACTIVE", NOT: { id: me.id } } }); if (!target) throw new BadRequestException("Colleague not found");
    if (await this.db.shiftSwapRequest.count({ where: { tenantId: me.tenantId, requesterId: me.id, date: day, status: { in: ["PENDING", "ACCEPTED"] } } })) throw new BadRequestException("You already have an open swap for that date");
    return this.db.shiftSwapRequest.create({ data: { tenantId: me.tenantId, requesterId: me.id, targetId: target.id, date: day } });
  }
  async swaps(u: AuthUser) {
    const me = await this.me(u), or: any[] = []; if (me) or.push({ requesterId: me.id }, { targetId: me.id });
    if (u.perms.includes("shift:approve")) or.push({ requester: restrict(u) }); if (!or.length) return [];
    const rows = await this.db.shiftSwapRequest.findMany({ where: { tenantId: tenant(u), OR: or }, include: { requester: { select: { fullName: true, userId: true } }, target: { select: { fullName: true, userId: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map(r => ({ ...r, mineAsTarget: r.target.userId === u.sub }));
  }
  async respond(u: AuthUser, id: string, accept: boolean) {
    const me = await this.meOrFail(u), r = await this.db.shiftSwapRequest.findFirst({ where: { id, tenantId: me.tenantId, targetId: me.id, status: "PENDING" } }); if (!r) throw new NotFoundException();
    return this.db.shiftSwapRequest.update({ where: { id }, data: { status: accept ? "ACCEPTED" : "REJECTED" } });
  }
  async decideSwap(u: AuthUser, id: string, approve: boolean) {
    const t = tenant(u), r = await this.db.shiftSwapRequest.findFirst({ where: { id, tenantId: t, requester: restrict(u), status: approve ? "ACCEPTED" : { in: ["PENDING", "ACCEPTED"] } }, include: { requester: true, target: true } });
    if (!r) throw new NotFoundException("Request not found or not in a state that can be decided");
    if (r.requester.userId === u.sub || r.target.userId === u.sub) throw new ForbiddenException("You cannot decide your own swap");
    if (approve) {
      const [a, b] = [r.requester, r.target], m = await this.bulkResolve(t, r.date, [a, b]), sa = m.get(a.id)!.shift?.id ?? null, sb = m.get(b.id)!.shift?.id ?? null;
      const up = (empId: string, shiftId: string | null) => this.db.shiftSchedule.upsert({ where: { tenantId_employeeId_date: { tenantId: t, employeeId: empId, date: r.date } }, create: { tenantId: t, employeeId: empId, date: r.date, shiftId }, update: { shiftId } });
      await this.db.$transaction([up(a.id, sb), up(b.id, sa)]);
    }
    await this.db.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: approve ? "SHIFT_SWAP_APPROVED" : "SHIFT_SWAP_REJECTED", entity: id } });
    return this.db.shiftSwapRequest.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", decidedById: u.sub } });
  }

  // ---------- holidays ----------
  holidays(u: AuthUser, year?: string) {
    const y = +(year ?? new Date().getFullYear()); return this.db.holiday.findMany({ where: { tenantId: tenant(u), date: { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) } }, orderBy: { date: "asc" } });
  }
  async addHoliday(u: AuthUser, d: any) { const t = tenant(u); await this.refs(t, d); return this.db.holiday.create({ data: { tenantId: t, name: d.name, date: toDay(d.date), type: d.type ?? "COMPANY", branchId: d.branchId, departmentId: d.departmentId } }); }
  async removeHoliday(u: AuthUser, id: string) { const r = await this.db.holiday.deleteMany({ where: { id, tenantId: tenant(u) } }); if (!r.count) throw new NotFoundException(); return { ok: true }; }
}
