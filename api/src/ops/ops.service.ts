import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { scope } from "../hr/scope";
import { toDay } from "../attendance/util";
import { NotificationService } from "../celebrations/infra";

const tenant = (u: AuthUser) => scope({ ...u, branchId: null, departmentId: null }).tenantId;
const restrict = (u: AuthUser) => { const { tenantId, ...r } = scope(u); return r; };
const dt = (s?: string) => (s ? new Date(s) : undefined);
const has = (u: AuthUser, p: string) => u.perms.includes(p);

@Injectable()
export class OpsService {
  constructor(private db: PrismaService, private notes: NotificationService) {}
  private async me(u: AuthUser) { const e = await this.db.employee.findFirst({ where: { userId: u.sub, tenantId: tenant(u), status: "ACTIVE" } }); if (!e) throw new BadRequestException("No employee profile is linked to your login"); return e; }
  private log(u: AuthUser, action: string, entity?: string, meta?: any) { return this.db.auditLog.create({ data: { tenantId: tenant(u), actorId: u.sub, action, entity, meta } }); }
  private async emp(u: AuthUser, id: string) { const e = await this.db.employee.findFirst({ where: { id, ...scope(u) } }); if (!e) throw new NotFoundException("Employee not found"); return e; }

  // ---- announcements ----
  announcements(u: AuthUser) { return this.db.announcement.findMany({ where: { tenantId: tenant(u), OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 50 }); }
  async addAnnouncement(u: AuthUser, d: any) {
    const t = tenant(u), a = await this.db.announcement.create({ data: { tenantId: t, title: d.title, body: d.body, pinned: !!d.pinned, expiresAt: dt(d.expiresAt), createdById: u.sub } });
    await this.notes.notify(t, (await this.db.user.findMany({ where: { tenantId: t, status: "ACTIVE" }, select: { id: true } })).map(x => x.id), { type: "ANNOUNCEMENT", title: d.title, body: d.body.slice(0, 200), link: "/employee/more" }); return a;
  }
  async delAnnouncement(u: AuthUser, id: string) { const r = await this.db.announcement.deleteMany({ where: { id, tenantId: tenant(u) } }); if (!r.count) throw new NotFoundException(); return { ok: true }; }

  // ---- expenses ----
  async addExpense(u: AuthUser, d: any) {
    const e = await this.me(u); let receipt: Buffer | undefined, receiptType: string | undefined;
    if (d.receipt) { const m = /^data:(image\/(?:jpeg|png)|application\/pdf);base64,(.+)$/.exec(d.receipt); receipt = m ? Buffer.from(m[2], "base64") : undefined; if (!m || receipt!.length > 700000) throw new BadRequestException("Receipt must be a JPG/PNG/PDF under 700 KB"); receiptType = m[1]; }
    return this.db.expenseClaim.create({ data: { tenantId: e.tenantId, employeeId: e.id, category: d.category, amount: d.amount, expenseDate: toDay(d.expenseDate), description: d.description, receipt, receiptType }, select: { id: true, status: true } });
  }
  private expSel = { id: true, category: true, amount: true, expenseDate: true, description: true, status: true, reviewNote: true, receiptType: true, createdAt: true, paidAt: true } as const;
  async myExpenses(u: AuthUser) { const e = await this.me(u); return this.db.expenseClaim.findMany({ where: { employeeId: e.id }, select: this.expSel, orderBy: { createdAt: "desc" }, take: 100 }); }
  expenses(u: AuthUser, status?: string) { return this.db.expenseClaim.findMany({ where: { tenantId: tenant(u), employee: restrict(u), ...(status ? { status: status as any } : {}) }, select: { ...this.expSel, employee: { select: { fullName: true, employeeCode: true } } }, orderBy: { createdAt: "desc" }, take: 200 }); }
  async decideExpense(u: AuthUser, id: string, approve: boolean, note?: string) {
    const x = await this.db.expenseClaim.findFirst({ where: { id, tenantId: tenant(u), employee: restrict(u), status: "PENDING" }, include: { employee: true } }); if (!x) throw new NotFoundException("Claim not found or already reviewed");
    if (x.employee.userId === u.sub) throw new ForbiddenException("You cannot review your own claim");
    await this.db.expenseClaim.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", reviewedById: u.sub, reviewNote: note } }); await this.log(u, approve ? "EXPENSE_APPROVED" : "EXPENSE_REJECTED", id);
    if (x.employee.userId) await this.notes.notify(x.tenantId, [x.employee.userId], { type: "EXPENSE", title: `Expense ${approve ? "approved" : "rejected"}`, body: `${x.category} ₹${x.amount}${note ? ` — ${note}` : ""}`, link: "/employee/more" }); return { ok: true };
  }
  /** Mark paid; optionally queue the amount as a reimbursement in the next payroll run. */
  async payExpense(u: AuthUser, id: string, viaPayroll: boolean) {
    const t = tenant(u), x = await this.db.expenseClaim.findFirst({ where: { id, tenantId: t, employee: restrict(u), status: "APPROVED" } }); if (!x) throw new NotFoundException("Only approved claims can be paid");
    await this.db.$transaction(async tx => { await tx.expenseClaim.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
      if (viaPayroll) await tx.payrollAdjustment.create({ data: { tenantId: t, employeeId: x.employeeId, targetMonth: new Date().toISOString().slice(0, 7), amount: x.amount, reason: `Expense reimbursement: ${x.category}`, createdById: u.sub } }); });
    await this.log(u, "EXPENSE_PAID", id, { viaPayroll }); return { ok: true };
  }
  async receipt(u: AuthUser, id: string) {
    const x = await this.db.expenseClaim.findFirst({ where: { id, tenantId: tenant(u) }, include: { employee: true } }); if (!x?.receipt) throw new NotFoundException();
    if (x.employee.userId !== u.sub && !(has(u, "expense:view") && (await this.db.employee.count({ where: { id: x.employeeId, ...scope(u) } })))) throw new ForbiddenException(); return { buf: Buffer.from(x.receipt), type: x.receiptType! };
  }

  // ---- assets ----
  assets(u: AuthUser) { return this.db.asset.findMany({ where: { tenantId: tenant(u) }, include: { assignments: { where: { returnedAt: null }, include: { employee: { select: { fullName: true, employeeCode: true } } } } }, orderBy: { tag: "asc" }, take: 500 }); }
  addAsset(u: AuthUser, d: any) { return this.db.asset.create({ data: { tenantId: tenant(u), tag: d.tag, name: d.name, category: d.category, serial: d.serial, purchaseDate: dt(d.purchaseDate) } }); }
  async editAsset(u: AuthUser, id: string, d: any) { const a = await this.db.asset.findFirst({ where: { id, tenantId: tenant(u) } }); if (!a) throw new NotFoundException(); if (a.status === "ASSIGNED") throw new BadRequestException("Return the asset before editing/retiring it");
    return this.db.asset.update({ where: { id }, data: { ...d, purchaseDate: dt(d.purchaseDate) } }); }
  async assignAsset(u: AuthUser, id: string, employeeId: string) {
    const t = tenant(u), e = await this.emp(u, employeeId), r = await this.db.asset.updateMany({ where: { id, tenantId: t, status: "AVAILABLE" }, data: { status: "ASSIGNED" } }); if (!r.count) throw new BadRequestException("Asset not available");
    await this.db.assetAssignment.create({ data: { tenantId: t, assetId: id, employeeId: e.id } }); await this.log(u, "ASSET_ASSIGNED", id, { employeeId }); return { ok: true };
  }
  async returnAsset(u: AuthUser, id: string, note?: string) {
    const t = tenant(u), r = await this.db.assetAssignment.updateMany({ where: { assetId: id, tenantId: t, returnedAt: null }, data: { returnedAt: new Date(), returnNote: note } }); if (!r.count) throw new BadRequestException("Asset is not assigned");
    await this.db.asset.update({ where: { id }, data: { status: "AVAILABLE" } }); await this.log(u, "ASSET_RETURNED", id); return { ok: true };
  }
  async myAssets(u: AuthUser) { const e = await this.me(u); return this.db.assetAssignment.findMany({ where: { employeeId: e.id }, include: { asset: true }, orderBy: { assignedAt: "desc" } }); }

  // ---- recruitment ----
  jobs(u: AuthUser) { return this.db.jobOpening.findMany({ where: { tenantId: tenant(u) }, include: { _count: { select: { candidates: true } } }, orderBy: { createdAt: "desc" } }); }
  addJob(u: AuthUser, d: any) { return this.db.jobOpening.create({ data: { ...d, tenantId: tenant(u) } }); }
  async editJob(u: AuthUser, id: string, d: any) { const r = await this.db.jobOpening.updateMany({ where: { id, tenantId: tenant(u) }, data: d }); if (!r.count) throw new NotFoundException(); return { ok: true }; }
  candidates(u: AuthUser, jobId?: string) { return this.db.candidate.findMany({ where: { tenantId: tenant(u), ...(jobId ? { jobId } : {}) }, include: { interviews: { orderBy: { scheduledAt: "desc" } }, job: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 500 }); }
  async addCandidate(u: AuthUser, d: any) { if (!(await this.db.jobOpening.count({ where: { id: d.jobId, tenantId: tenant(u) } }))) throw new BadRequestException("Invalid job"); return this.db.candidate.create({ data: { ...d, tenantId: tenant(u) } }); }
  async editCandidate(u: AuthUser, id: string, d: any) { const r = await this.db.candidate.updateMany({ where: { id, tenantId: tenant(u) }, data: d }); if (!r.count) throw new NotFoundException(); if (d.stage) await this.log(u, "CANDIDATE_" + d.stage, id); return { ok: true }; }
  async delCandidate(u: AuthUser, id: string) { const r = await this.db.candidate.deleteMany({ where: { id, tenantId: tenant(u) } }); if (!r.count) throw new NotFoundException(); return { ok: true }; }
  async addInterview(u: AuthUser, id: string, d: any) { if (!(await this.db.candidate.count({ where: { id, tenantId: tenant(u) } }))) throw new NotFoundException(); return this.db.interview.create({ data: { candidateId: id, scheduledAt: new Date(d.scheduledAt), interviewerId: d.interviewerId, mode: d.mode ?? "In person" } }); }
  async editInterview(u: AuthUser, id: string, d: any) { const r = await this.db.interview.updateMany({ where: { id, candidate: { tenantId: tenant(u) } }, data: d }); if (!r.count) throw new NotFoundException(); return { ok: true }; }

  // ---- performance ----
  cycles(u: AuthUser) { return this.db.perfCycle.findMany({ where: { tenantId: tenant(u) }, orderBy: { fromDate: "desc" } }); }
  addCycle(u: AuthUser, d: any) { return this.db.perfCycle.create({ data: { tenantId: tenant(u), name: d.name, fromDate: toDay(d.fromDate), toDate: toDay(d.toDate) } }); }
  async closeCycle(u: AuthUser, id: string) { const r = await this.db.perfCycle.updateMany({ where: { id, tenantId: tenant(u) }, data: { status: "CLOSED" } }); if (!r.count) throw new NotFoundException(); return { ok: true }; }
  goals(u: AuthUser, q: any) { return this.db.goal.findMany({ where: { tenantId: tenant(u), employee: restrict(u), ...(q.cycleId ? { cycleId: q.cycleId } : {}), ...(q.employeeId ? { employeeId: q.employeeId } : {}) }, include: { employee: { select: { fullName: true, employeeCode: true } } }, take: 500 }); }
  async addGoal(u: AuthUser, d: any) { const e = await this.emp(u, d.employeeId); if (!(await this.db.perfCycle.count({ where: { id: d.cycleId, tenantId: e.tenantId, status: "OPEN" } }))) throw new BadRequestException("Invalid or closed cycle"); return this.db.goal.create({ data: { ...d, tenantId: e.tenantId } }); }
  async myGoals(u: AuthUser, cycleId?: string) { const e = await this.me(u); return this.db.goal.findMany({ where: { employeeId: e.id, ...(cycleId ? { cycleId } : {}) } }); }
  async progress(u: AuthUser, id: string, progress: number) {
    const g = await this.db.goal.findFirst({ where: { id, tenantId: tenant(u) }, include: { employee: true, cycle: true } }); if (!g || g.cycle.status !== "OPEN") throw new NotFoundException("Goal not found or cycle closed");
    if (g.employee.userId !== u.sub && !(has(u, "performance:manage") && (await this.db.employee.count({ where: { id: g.employeeId, ...scope(u) } })))) throw new ForbiddenException(); return this.db.goal.update({ where: { id }, data: { progress } });
  }
  async selfReview(u: AuthUser, d: any) { const e = await this.me(u); if (!(await this.db.perfCycle.count({ where: { id: d.cycleId, tenantId: e.tenantId, status: "OPEN" } }))) throw new BadRequestException("Invalid or closed cycle");
    return this.db.review.upsert({ where: { cycleId_employeeId: { cycleId: d.cycleId, employeeId: e.id } }, create: { tenantId: e.tenantId, cycleId: d.cycleId, employeeId: e.id, selfRating: d.rating, selfComments: d.comments }, update: { selfRating: d.rating, selfComments: d.comments } }); }
  async mgrReview(u: AuthUser, d: any) { const e = await this.emp(u, d.employeeId); if (e.userId === u.sub) throw new ForbiddenException("You cannot rate yourself"); if (!(await this.db.perfCycle.count({ where: { id: d.cycleId, tenantId: e.tenantId } }))) throw new BadRequestException("Invalid cycle");
    await this.log(u, "REVIEW_SUBMITTED", e.id, { cycleId: d.cycleId, rating: d.rating }); return this.db.review.upsert({ where: { cycleId_employeeId: { cycleId: d.cycleId, employeeId: e.id } }, create: { tenantId: e.tenantId, cycleId: d.cycleId, employeeId: e.id, mgrRating: d.rating, mgrComments: d.comments, reviewerId: u.sub }, update: { mgrRating: d.rating, mgrComments: d.comments, reviewerId: u.sub } }); }
  reviews(u: AuthUser, cycleId?: string) { return this.db.review.findMany({ where: { tenantId: tenant(u), employee: restrict(u), ...(cycleId ? { cycleId } : {}) }, include: { employee: { select: { fullName: true, employeeCode: true } } }, take: 500 }); }
  async myReviews(u: AuthUser) { const e = await this.me(u); return this.db.review.findMany({ where: { employeeId: e.id } }); }

  // ---- helpdesk ----
  async addTicket(u: AuthUser, d: any) { const e = await this.me(u); return this.db.ticket.create({ data: { tenantId: e.tenantId, employeeId: e.id, subject: d.subject, description: d.description, category: d.category ?? "General", priority: d.priority ?? "MEDIUM" } }); }
  async myTickets(u: AuthUser) { const e = await this.me(u); return this.db.ticket.findMany({ where: { employeeId: e.id }, orderBy: { createdAt: "desc" }, take: 100 }); }
  tickets(u: AuthUser, status?: string) { return this.db.ticket.findMany({ where: { tenantId: tenant(u), employee: restrict(u), ...(status ? { status: status as any } : {}) }, include: { employee: { select: { fullName: true } } }, orderBy: { createdAt: "desc" }, take: 200 }); }
  private async ticketFor(u: AuthUser, id: string) { const t = await this.db.ticket.findFirst({ where: { id, tenantId: tenant(u) }, include: { employee: true } }); if (!t) throw new NotFoundException();
    if (t.employee.userId !== u.sub && !(has(u, "helpdesk:view") && (await this.db.employee.count({ where: { id: t.employeeId, ...scope(u) } })))) throw new ForbiddenException(); return t; }
  async ticket(u: AuthUser, id: string) { await this.ticketFor(u, id); return this.db.ticket.findUnique({ where: { id }, include: { comments: { orderBy: { createdAt: "asc" } }, employee: { select: { fullName: true } } } }); }
  async comment(u: AuthUser, id: string, body: string) { const t = await this.ticketFor(u, id), name = (await this.db.user.findUnique({ where: { id: u.sub } }))?.name ?? "";
    const c = await this.db.ticketComment.create({ data: { ticketId: id, authorId: u.sub, authorName: name, body } });
    if (t.employee.userId && t.employee.userId !== u.sub) await this.notes.notify(t.tenantId, [t.employee.userId], { type: "HELPDESK", title: `New reply on "${t.subject}"`, body: body.slice(0, 150), link: "/employee/more" }); return c; }
  async updateTicket(u: AuthUser, id: string, d: any) {
    const t = await this.ticketFor(u, id), done = ["RESOLVED", "CLOSED"].includes(d.status ?? t.status); const x = await this.db.ticket.update({ where: { id }, data: { ...d, resolvedAt: done ? t.resolvedAt ?? new Date() : null } });
    if (d.status && d.status !== t.status && t.employee.userId) await this.notes.notify(t.tenantId, [t.employee.userId], { type: "HELPDESK", title: `Ticket ${d.status.replace("_", " ").toLowerCase()}`, body: t.subject, link: "/employee/more" }); return x;
  }
}
