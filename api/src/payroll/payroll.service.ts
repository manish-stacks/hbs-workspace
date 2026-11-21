import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { csvCell, scope } from "../hr/scope";
import { localDate, toDay } from "../attendance/util";
import { ShiftService } from "../shifts/shifts.service";
import { DEFAULT_CFG, PayCfg, PayInput, calcPay, paise, rupees } from "./payroll.logic";
import { NotificationService } from "../celebrations/infra";
import { SlipData, slipsToBuffer } from "./payslip.pdf";

const tenant = (u: AuthUser) => scope({ ...u, branchId: null, departmentId: null }).tenantId;
const restrict = (u: AuthUser) => { const { tenantId, ...r } = scope(u); return r; };
const addDays = (d: Date, n: number) => new Date(+d + n * 864e5);
const label = (m: string) => new Date(m + "-01T00:00:00Z").toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const money = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, rupees(v)]));
const NAMES: Record<string, string> = { basic: "Basic", hra: "HRA", da: "DA", conveyance: "Conveyance", medical: "Medical allowance", special: "Special allowance", overtime: "Overtime", bonus: "Bonus", incentive: "Incentive", arrears: "Arrears / adjustment",
  lwp: "Loss of pay", pf: "Provident fund", esi: "ESI", pt: "Professional tax", tds: "TDS", loan: "Loan EMI", advance: "Salary advance", other: "Other deductions", adjustment: "Adjustment" };

@Injectable()
export class PayrollService {
  constructor(private db: PrismaService, private shifts: ShiftService, private notes: NotificationService) {}
  private async tz(t: string) { return (await this.db.company.findUnique({ where: { tenantId: t } }))?.timezone ?? "Asia/Kolkata"; }
  async cfg(t: string): Promise<PayCfg> { const r = await this.db.companySetting.findUnique({ where: { tenantId_key: { tenantId: t, key: "payroll" } } }); return { ...DEFAULT_CFG, ...((r?.value as any) ?? {}) }; }
  getSettings(u: AuthUser) { return this.cfg(tenant(u)); }
  async putSettings(u: AuthUser, v: any) { const t = tenant(u), value = { ...DEFAULT_CFG, ...v };
    await this.db.companySetting.upsert({ where: { tenantId_key: { tenantId: t, key: "payroll" } }, create: { tenantId: t, key: "payroll", value }, update: { value } });
    await this.db.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "PAYROLL_SETTINGS_CHANGED", meta: value } }); return value; }

  // ---- salary structures (every change is a new dated revision) ----
  structures(u: AuthUser, employeeId?: string) { return this.db.salaryStructure.findMany({ where: { tenantId: tenant(u), employee: restrict(u), ...(employeeId ? { employeeId } : {}) }, include: { employee: { select: { fullName: true, employeeCode: true, branch: { select: { name: true } }, department: { select: { name: true } }, designation: { select: { name: true } } } } }, orderBy: [{ employeeId: "asc" }, { effectiveFrom: "desc" }], take: 500 }); }
  async summaryRoster(u: AuthUser) {
    const t = tenant(u);
    const [emps, structs] = await Promise.all([
      this.db.employee.findMany({
        where: { tenantId: t, status: "ACTIVE" },
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
          joiningDate: true,
          branch: { select: { name: true } },
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
        orderBy: { fullName: "asc" },
      }),
      this.db.salaryStructure.findMany({
        where: { tenantId: t },
        orderBy: { effectiveFrom: "desc" },
      }),
    ]);

    const structMap = new Map<string, any>();
    for (const s of structs) {
      if (!structMap.has(s.employeeId)) structMap.set(s.employeeId, s);
    }

    return emps.map((e) => {
      const s = structMap.get(e.id) || null;
      const grossMonthly = s
        ? Number(s.basic) +
          Number(s.hra || 0) +
          Number(s.da || 0) +
          Number(s.conveyance || 0) +
          Number(s.medical || 0) +
          Number(s.special || 0)
        : 0;

      return {
        employee: e,
        structure: s,
        hasStructure: !!s,
        grossMonthly,
        annualCtc: grossMonthly * 12,
      };
    });
  }
  async addStructure(u: AuthUser, d: any) {
    const t = tenant(u), e = await this.db.employee.findFirst({ where: { id: d.employeeId, ...scope(u) } }); if (!e) throw new NotFoundException("Employee not found");
    const { effectiveFrom, ...rest } = d, r = await this.db.salaryStructure.create({ data: { ...rest, tenantId: t, effectiveFrom: toDay(effectiveFrom), createdById: u.sub } });
    await this.db.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "SALARY_REVISED", entity: e.id, meta: { effectiveFrom, basic: d.basic } } }); return r;
  }
  // ---- loans & advances ----
  loans(u: AuthUser) { return this.db.employeeLoan.findMany({ where: { tenantId: tenant(u), employee: restrict(u) }, include: { employee: { select: { fullName: true, employeeCode: true } } }, orderBy: { createdAt: "desc" }, take: 300 }); }
  async addLoan(u: AuthUser, d: any) {
    const e = await this.db.employee.findFirst({ where: { id: d.employeeId, ...scope(u) } }); if (!e) throw new NotFoundException("Employee not found");
    if (d.emi > d.principal) throw new BadRequestException("EMI cannot exceed the amount");
    const l = await this.db.employeeLoan.create({ data: { tenantId: e.tenantId, employeeId: e.id, kind: d.kind, principal: d.principal, emi: d.kind === "ADVANCE" ? d.principal : d.emi, startMonth: d.startMonth } });
    await this.db.auditLog.create({ data: { tenantId: e.tenantId, actorId: u.sub, action: "LOAN_CREATED", entity: l.id } }); return l;
  }
  async closeLoan(u: AuthUser, id: string) { const r = await this.db.employeeLoan.updateMany({ where: { id, tenantId: tenant(u), employee: restrict(u) }, data: { status: "CLOSED" } }); if (!r.count) throw new NotFoundException(); return { ok: true }; }
  async addAdjustment(u: AuthUser, d: any) {
    const e = await this.db.employee.findFirst({ where: { id: d.employeeId, ...scope(u) } }); if (!e) throw new NotFoundException("Employee not found");
    await this.db.auditLog.create({ data: { tenantId: e.tenantId, actorId: u.sub, action: "PAYROLL_ADJUSTMENT_ADDED", entity: e.id, meta: d } });
    return this.db.payrollAdjustment.create({ data: { tenantId: e.tenantId, employeeId: e.id, targetMonth: d.targetMonth, amount: d.amount, reason: d.reason, createdById: u.sub } });
  }

  // ---- attendance -> payable days ----
  private async attendanceDays(t: string, emps: any[], month: string) {
    const from = toDay(month + "-01"), to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1)), n = Math.round((+to - +from) / 864e5), dates = Array.from({ length: n }, (_, k) => addDays(from, k));
    const unpaid = new Set((await this.db.leaveType.findMany({ where: { tenantId: t, isPaid: false } })).map(x => `Leave: ${x.name}`)), ids = emps.map(e => e.id);
    const [recs, per] = await Promise.all([this.db.attendance.findMany({ where: { tenantId: t, workDate: { gte: from, lt: to }, employeeId: { in: ids } } }), Promise.all(dates.map(d => this.shifts.bulkResolve(t, d, emps)))]);
    const byEmp = new Map<string, Map<number, any>>(); for (const r of recs) { if (!byEmp.has(r.employeeId)) byEmp.set(r.employeeId, new Map()); byEmp.get(r.employeeId)!.set(+r.workDate, r); }
    return new Map(emps.map(e => { let paid = 0, absent = 0, present = 0, paidLeave = 0, unpaidLeave = 0, unmarked = 0, notJoined = 0, ot = 0;
      dates.forEach((d, k) => { if (d < e.joiningDate) { notJoined++; return; } const r = byEmp.get(e.id)?.get(+d), x = per[k].get(e.id)!;
        if (r) { ot += r.overtimeMinutes ?? 0;
          if (r.status === "PRESENT") { paid++; present++; } else if (r.status === "HALF_DAY") { paid += 0.5; present += 0.5; absent += 0.5; } else if (r.status === "ON_LEAVE") { if (unpaid.has(r.note ?? "")) unpaidLeave++; else { paid++; paidLeave++; } }
          else if (r.status === "WEEKLY_OFF" || r.status === "HOLIDAY") paid++; else absent++; }
        else if (x.holiday || x.weekOff) paid++; else { absent++; unmarked++; } });
      return [e.id, { daysInMonth: n, lossDays: n - paid, payable: paid, present, absent, paidLeave, unpaidLeave, unmarked, notJoined, otMinutes: ot }] as const; }));
  }

  // ---- runs ----
  runs(u: AuthUser) { return this.db.payrollRun.findMany({ where: { tenantId: tenant(u) }, orderBy: { month: "desc" }, take: 36 }); }
  private async totals(runId: string) {
    const a = await this.db.payrollItem.aggregate({ where: { runId }, _sum: { gross: true, totalDeductions: true, net: true, employerCost: true } });
    return this.db.payrollRun.update({ where: { id: runId }, data: { totalGross: a._sum.gross ?? 0, totalDeductions: a._sum.totalDeductions ?? 0, totalNet: a._sum.net ?? 0, employerCost: a._sum.employerCost ?? 0 } });
  }
  async createRun(u: AuthUser, month: string) {
    const t = tenant(u); if (u.branchId || u.departmentId) throw new ForbiddenException("Branch/department-restricted users cannot run company payroll");
    const from = toDay(month + "-01"), to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
    if (!/^\d{4}-\d{2}$/.test(month) || to > localDate(new Date(), await this.tz(t))) throw new BadRequestException("Payroll can only be run for completed months");
    const ex = await this.db.payrollRun.findUnique({ where: { tenantId_month: { tenantId: t, month } } }); if (ex && ex.status !== "DRAFT") throw new BadRequestException(`Payroll for ${month} is already ${ex.status}`);
    const cfg = await this.cfg(t), emps = await this.db.employee.findMany({ where: { tenantId: t, status: "ACTIVE", joiningDate: { lt: to } }, take: 5000 });
    const [structs, loans, adjs, att] = await Promise.all([ this.db.salaryStructure.findMany({ where: { tenantId: t, effectiveFrom: { lt: to } }, orderBy: { effectiveFrom: "desc" } }),
      this.db.employeeLoan.findMany({ where: { tenantId: t, status: "ACTIVE", startMonth: { lte: month } } }), this.db.payrollAdjustment.findMany({ where: { tenantId: t, appliedRunId: null, targetMonth: { lte: month } } }), this.attendanceDays(t, emps, month) ]);
    const sm = new Map<string, any>(); for (const s of structs) if (!sm.has(s.employeeId)) sm.set(s.employeeId, s);
    const items: any[] = [], skipped: string[] = [];
    for (const e of emps) { const s = sm.get(e.id), a = att.get(e.id)!; if (!s) { skipped.push(e.fullName); continue; }
      const own = loans.filter(l => l.employeeId === e.id).map(l => ({ kind: l.kind, amt: Math.min(paise(l.emi), paise(l.principal) - paise(l.repaid)) })).filter(l => l.amt > 0);
      const input: PayInput = { s: { basic: paise(s.basic), hra: paise(s.hra), da: paise(s.da), conveyance: paise(s.conveyance), medical: paise(s.medical), special: paise(s.special), pf: s.pfApplicable, esi: s.esiApplicable, pt: s.ptApplicable, otEligible: s.overtimeEligible, tds: paise(s.tdsMonthly) },
        daysInMonth: a.daysInMonth, lossDays: a.lossDays, otMinutes: a.otMinutes, bonus: 0, incentive: 0, otherDeduction: 0, loan: own.filter(l => l.kind === "LOAN").reduce((x, l) => x + l.amt, 0), advance: own.filter(l => l.kind === "ADVANCE").reduce((x, l) => x + l.amt, 0),
        adjustment: adjs.filter(x => x.employeeId === e.id).reduce((x, y) => x + paise(y.amount), 0) };
      const c = calcPay(input, cfg); if (a.unmarked) c.warnings.push(`${a.unmarked} unmarked day(s) counted as absent — finalize attendance first`);
      items.push({ tenantId: t, employeeId: e.id, gross: rupees(c.gross), totalDeductions: rupees(c.totalDeductions), net: rupees(c.net), employerCost: rupees(c.pfEmployer + c.esiEmployer), earnings: money(c.earnings), deductions: money(c.deductions), days: { ...a, warnings: c.warnings }, inputs: input }); }
    const run = await this.db.$transaction(async tx => {
      const r = ex ?? await tx.payrollRun.create({ data: { tenantId: t, month, createdById: u.sub } });
      await tx.payrollItem.deleteMany({ where: { runId: r.id } }); await tx.payrollItem.createMany({ data: items.map(i => ({ ...i, runId: r.id })) });
      await tx.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "PAYROLL_RUN_CALCULATED", entity: r.id, meta: { month, employees: items.length } } }); return r; });
    return { run: await this.totals(run.id), employees: items.length, skippedNoStructure: skipped };
  }
  async getRun(u: AuthUser, id: string, q: any) {
    const t = tenant(u), run = await this.db.payrollRun.findFirst({ where: { id, tenantId: t } }); if (!run) throw new NotFoundException();
    const f: any[] = [restrict(u)]; if (q.branchId) f.push({ branchId: q.branchId }); if (q.departmentId) f.push({ departmentId: q.departmentId });
    const items = await this.db.payrollItem.findMany({ where: { runId: id, employee: { AND: f } }, include: { employee: { select: { fullName: true, employeeCode: true, branch: { select: { name: true } }, department: { select: { name: true } } } } }, orderBy: { employee: { fullName: "asc" } } });
    const sum = (k: "gross" | "totalDeductions" | "net" | "employerCost") => items.reduce((a, i) => a + Number(i[k]), 0);
    return { run, items, filteredTotals: { gross: sum("gross"), deductions: sum("totalDeductions"), net: sum("net"), employerCost: sum("employerCost") } };
  }
  private async mutable(u: AuthUser, id: string, status: string) { const r = await this.db.payrollRun.findFirst({ where: { id, tenantId: tenant(u) } }); if (!r) throw new NotFoundException(); if (r.status !== status) throw new BadRequestException(`Run is ${r.status}; expected ${status}`); return r; }
  async editItem(u: AuthUser, id: string, itemId: string, d: any) {
    await this.mutable(u, id, "DRAFT"); const t = tenant(u), it = await this.db.payrollItem.findFirst({ where: { id: itemId, runId: id, tenantId: t } }); if (!it) throw new NotFoundException();
    const inp: any = { ...(it.inputs as any) }; for (const k of ["bonus", "incentive", "otherDeduction"]) if (d[k] !== undefined) inp[k] = paise(d[k]);
    const c = calcPay(inp, await this.cfg(t)), days: any = it.days; c.warnings.push(...(days.warnings ?? []).filter((w: string) => /unmarked/.test(w)));
    await this.db.payrollItem.update({ where: { id: itemId }, data: { gross: rupees(c.gross), totalDeductions: rupees(c.totalDeductions), net: rupees(c.net), employerCost: rupees(c.pfEmployer + c.esiEmployer), earnings: money(c.earnings), deductions: money(c.deductions), days: { ...days, warnings: c.warnings }, inputs: inp } });
    await this.db.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "PAYROLL_ITEM_EDITED", entity: itemId, meta: d } }); await this.totals(id); return { ok: true };
  }
  async submit(u: AuthUser, id: string) { await this.mutable(u, id, "DRAFT"); const bad = await this.db.payrollItem.count({ where: { runId: id, net: { lt: 0 } } }); if (bad) throw new BadRequestException(`${bad} employee(s) have negative net pay — fix before submitting`);
    await this.db.payrollRun.update({ where: { id }, data: { status: "SUBMITTED", submittedById: u.sub } }); await this.log(u, "PAYROLL_SUBMITTED", id); return { ok: true }; }
  async approve(u: AuthUser, id: string) { const r = await this.mutable(u, id, "SUBMITTED"); if (r.submittedById === u.sub && !u.roles.includes("Company Owner")) throw new ForbiddenException("Approver must differ from the submitter");
    await this.db.payrollRun.update({ where: { id }, data: { status: "APPROVED", approvedById: u.sub } }); await this.log(u, "PAYROLL_APPROVED", id); return { ok: true }; }
  async reject(u: AuthUser, id: string) { const r = await this.db.payrollRun.findFirst({ where: { id, tenantId: tenant(u) } }); if (!r || !["SUBMITTED", "APPROVED"].includes(r.status)) throw new BadRequestException("Only submitted/approved runs can be sent back");
    await this.db.payrollRun.update({ where: { id }, data: { status: "DRAFT", submittedById: null, approvedById: null } }); await this.log(u, "PAYROLL_SENT_BACK", id); return { ok: true }; }
  /** Lock: generates payslips, books loan repayments, marks adjustments applied. Locked runs are immutable. */
  async lock(u: AuthUser, id: string) {
    const t = tenant(u), run = await this.mutable(u, id, "APPROVED"), items = await this.db.payrollItem.findMany({ where: { runId: id } });
    await this.db.$transaction(async tx => {
      await tx.payslip.createMany({ skipDuplicates: true, data: items.map(i => ({ tenantId: t, runId: id, employeeId: i.employeeId, number: `PS-${run.month.replace("-", "")}-${i.id.slice(-6).toUpperCase()}` })) });
      for (const i of items) { const inp: any = i.inputs, deduct = (inp.loan + inp.advance) / 100;
        if (deduct > 0) { const ls = await tx.employeeLoan.findMany({ where: { tenantId: t, employeeId: i.employeeId, status: "ACTIVE", startMonth: { lte: run.month } } });
          for (const l of ls) { const amt = Math.min(Number(l.emi), Number(l.principal) - Number(l.repaid)); if (amt <= 0) continue; const repaid = Number(l.repaid) + amt; await tx.employeeLoan.update({ where: { id: l.id }, data: { repaid, status: repaid >= Number(l.principal) ? "CLOSED" : "ACTIVE" } }); } }
        if (inp.adjustment) await tx.payrollAdjustment.updateMany({ where: { tenantId: t, employeeId: i.employeeId, appliedRunId: null, targetMonth: { lte: run.month } }, data: { appliedRunId: id } }); }
      await tx.payrollRun.update({ where: { id }, data: { status: "LOCKED", lockedById: u.sub, lockedAt: new Date() } });
      await tx.auditLog.create({ data: { tenantId: t, actorId: u.sub, action: "PAYROLL_LOCKED", entity: id, meta: { month: run.month, net: String(run.totalNet) } } }); });
    const us = await this.db.employee.findMany({ where: { id: { in: items.map(i => i.employeeId) }, userId: { not: null } }, select: { userId: true } });
    await this.notes.notify(t, us.map(x => x.userId!), { type: "PAYSLIP", title: "Payslip generated", body: `Your payslip for ${label(run.month)} is ready.`, link: "/employee/payslips" });
    return { ok: true, payslips: items.length };
  }
  private log(u: AuthUser, action: string, entity: string) { return this.db.auditLog.create({ data: { tenantId: tenant(u), actorId: u.sub, action, entity } }); }

  async exportCsv(u: AuthUser, id: string, type: string) {
    const { run, items } = await this.getRun(u, id, {}); if (!["APPROVED", "LOCKED"].includes(run.status) && type === "bank") throw new BadRequestException("Bank statement is available after approval");
    const banks = new Map((await this.db.employeeBankDetails.findMany({ where: { employeeId: { in: items.map(i => i.employeeId) } } })).map(b => [b.employeeId, b]));
    const rows: any[][] = type === "bank" ? [["Employee ID", "Name", "Bank", "Account number", "IFSC", "Net pay", "Narration"], ...items.map(i => { const b = banks.get(i.employeeId); return [i.employee.employeeCode, i.employee.fullName, b?.bankName, b?.accountNumber, b?.ifsc, i.net, `Salary ${run.month}`]; })]
      : [["Employee ID", "Name", "Branch", "Department", "Payable days", "Gross", "Deductions", "Net", "Employer cost"], ...items.map(i => [i.employee.employeeCode, i.employee.fullName, i.employee.branch?.name, i.employee.department?.name, (i.days as any).daysInMonth - (i.days as any).lossDays, i.gross, i.totalDeductions, i.net, i.employerCost])];
    await this.log(u, "PAYROLL_EXPORT_" + type.toUpperCase(), id); return rows.map(r => r.map(csvCell).join(",")).join("\n");
  }

  // ---- payslips ----
  private async slipData(ids: { runId: string; employeeId: string }[]): Promise<SlipData[]> {
    const rows = await this.db.payslip.findMany({ where: { OR: ids }, include: { run: true, employee: { include: { designation: true, department: true, branch: true } } } });
    const items = await this.db.payrollItem.findMany({ where: { OR: ids } }), co = rows.length ? await this.db.company.findUnique({ where: { tenantId: rows[0].tenantId } }) : null;
    return rows.map(p => { const it = items.find(i => i.runId === p.runId && i.employeeId === p.employeeId)!, p2 = (o: any) => Object.entries(o).map(([k, v]) => [NAMES[k] ?? k, paise(v)] as [string, number]);
      return { company: co?.name ?? "", month: label(p.run.month), number: p.number, employee: { name: p.employee.fullName, code: p.employee.employeeCode, designation: p.employee.designation?.name, department: p.employee.department?.name, branch: p.employee.branch?.name, joining: p.employee.joiningDate.toISOString().slice(0, 10) },
        earnings: p2(it.earnings), deductions: p2(it.deductions), gross: paise(it.gross), totalDeductions: paise(it.totalDeductions), net: paise(it.net), days: it.days }; });
  }
  async myPayslips(u: AuthUser) { const e = await this.db.employee.findFirst({ where: { userId: u.sub, tenantId: tenant(u) } }); if (!e) return [];
    const ps = await this.db.payslip.findMany({ where: { employeeId: e.id }, include: { run: { select: { month: true } } }, orderBy: { createdAt: "desc" }, take: 60 }), items = await this.db.payrollItem.findMany({ where: { employeeId: e.id, runId: { in: ps.map(p => p.runId) } }, select: { runId: true, net: true } });
    return ps.map(p => ({ id: p.id, number: p.number, month: p.run.month, net: items.find(i => i.runId === p.runId)?.net })); }
  async payslipPdf(u: AuthUser, id: string) {
    const p = await this.db.payslip.findFirst({ where: { id, tenantId: tenant(u) }, include: { employee: true } }); if (!p) throw new NotFoundException();
    if (p.employee.userId !== u.sub && !(u.perms.includes("payroll:view") && (await this.db.employee.count({ where: { id: p.employeeId, ...scope(u) } })))) throw new ForbiddenException();
    return { buf: await slipsToBuffer(await this.slipData([{ runId: p.runId, employeeId: p.employeeId }])), name: `${p.number}.pdf` };
  }
  async runPayslipsPdf(u: AuthUser, id: string) {
    const run = await this.db.payrollRun.findFirst({ where: { id, tenantId: tenant(u), status: "LOCKED" } }); if (!run) throw new BadRequestException("Payslips are generated when the run is locked");
    const ps = await this.db.payslip.findMany({ where: { runId: id, employee: restrict(u) } }); if (!ps.length) throw new NotFoundException();
    await this.log(u, "PAYSLIPS_BULK_DOWNLOAD", id); return { buf: await slipsToBuffer(await this.slipData(ps.map(p => ({ runId: id, employeeId: p.employeeId })))), name: `payslips-${run.month}.pdf` };
  }
}
