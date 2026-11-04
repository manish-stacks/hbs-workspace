import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { scope } from "../hr/scope";
import { rate, weighted } from "./crm.logic";

const tenant = (u: AuthUser) => scope({ ...u, branchId: null, departmentId: null }).tenantId;
const manage = (u: AuthUser) => u.perms.includes("crm:manage");
const own = (u: AuthUser) => (manage(u) ? {} : { ownerId: u.sub });          // sales executives only see their own records
const dt = (s?: string) => (s ? new Date(s) : undefined);
const page = (q: any) => { const p = Math.max(1, +q.page || 1), n = Math.min(100, +q.pageSize || 20); return { skip: (p - 1) * n, take: n, page: p, pageSize: n }; };

@Injectable()
export class CrmService {
  constructor(private db: PrismaService) {}
  users(u: AuthUser) { return this.db.user.findMany({ where: { tenantId: tenant(u), status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }); }
  private async ownerOf(u: AuthUser, id?: string) {
    if (!id || id === u.sub || !manage(u)) return u.sub;
    if (!(await this.db.user.count({ where: { id, tenantId: tenant(u), status: "ACTIVE" } }))) throw new BadRequestException("Invalid owner"); return id;
  }
  private log(u: AuthUser, action: string, entity: string, meta?: any) { return this.db.auditLog.create({ data: { tenantId: tenant(u), actorId: u.sub, action, entity, meta } }); }
  private note(u: AuthUser, leadId: string | undefined, dealId: string | undefined, subject: string) { return this.db.crmActivity.create({ data: { tenantId: tenant(u), kind: "NOTE", subject, ownerId: u.sub, createdById: u.sub, leadId, dealId, doneAt: new Date() } }); }

  // ---- leads ----
  async leads(u: AuthUser, q: any) {
    const t = tenant(u), pg = page(q), where: any = { tenantId: t, ...own(u), ...(q.status ? { status: q.status } : {}), ...(q.source ? { source: q.source } : {}), ...(q.priority ? { priority: q.priority } : {}) };
    if (q.q) where.OR = ["name", "company", "email", "phone"].map(f => ({ [f]: { contains: String(q.q) } }));
    const [items, total] = await Promise.all([this.db.crmLead.findMany({ where, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take }), this.db.crmLead.count({ where })]);
    return { items, total, page: pg.page, pageSize: pg.pageSize };
  }
  async addLead(u: AuthUser, d: any) { const { ownerId, nextFollowUpAt, ...r } = d; const l = await this.db.crmLead.create({ data: { ...r, tenantId: tenant(u), ownerId: await this.ownerOf(u, ownerId), nextFollowUpAt: dt(nextFollowUpAt) } }); await this.note(u, l.id, undefined, "Lead created"); return l; }
  async editLead(u: AuthUser, id: string, d: any) {
    const cur = await this.db.crmLead.findFirst({ where: { id, tenantId: tenant(u), ...own(u) } }); if (!cur) throw new NotFoundException();
    if (cur.status === "CONVERTED") throw new BadRequestException("Converted leads are read-only");
    const { ownerId, nextFollowUpAt, ...r } = d, data: any = { ...r, ...(nextFollowUpAt !== undefined ? { nextFollowUpAt: dt(nextFollowUpAt) } : {}), ...(ownerId ? { ownerId: await this.ownerOf(u, ownerId) } : {}) };
    const l = await this.db.crmLead.update({ where: { id }, data }); if (d.status && d.status !== cur.status) await this.note(u, id, undefined, `Status: ${cur.status} → ${d.status}`); return l;
  }
  async delLead(u: AuthUser, id: string) { const r = await this.db.crmLead.deleteMany({ where: { id, tenantId: tenant(u), ...own(u) } }); if (!r.count) throw new NotFoundException(); await this.log(u, "CRM_LEAD_DELETED", id); return { ok: true }; }
  async convert(u: AuthUser, id: string, d: any) {
    const t = tenant(u), l = await this.db.crmLead.findFirst({ where: { id, tenantId: t, ...own(u) } }); if (!l) throw new NotFoundException();
    if (l.status === "CONVERTED") throw new BadRequestException("Already converted");
    const r = await this.db.$transaction(async tx => {
      const c = await tx.crmCustomer.create({ data: { tenantId: t, name: l.name, company: l.company, email: l.email, phone: l.phone, ownerId: l.ownerId, notes: l.notes } });
      const deal = await tx.crmDeal.create({ data: { tenantId: t, title: d.dealTitle || `${l.company || l.name} — opportunity`, customerId: c.id, leadId: l.id, value: d.value ?? 0, stage: "INTERESTED", ownerId: l.ownerId } });
      await tx.crmLead.update({ where: { id }, data: { status: "CONVERTED", convertedCustomerId: c.id } });
      await tx.crmActivity.create({ data: { tenantId: t, kind: "NOTE", subject: "Converted to customer + deal", ownerId: u.sub, createdById: u.sub, leadId: id, doneAt: new Date() } }); return { customer: c, deal }; });
    await this.log(u, "CRM_LEAD_CONVERTED", id); return r;
  }
  async leadHistory(u: AuthUser, id: string) { if (!(await this.db.crmLead.count({ where: { id, tenantId: tenant(u), ...own(u) } }))) throw new NotFoundException(); return this.db.crmActivity.findMany({ where: { leadId: id, tenantId: tenant(u) }, orderBy: { createdAt: "desc" }, take: 100 }); }

  // ---- customers ----
  async customers(u: AuthUser, q: any) {
    const pg = page(q), where: any = { tenantId: tenant(u), ...own(u) }; if (q.q) where.OR = ["name", "company", "email", "phone"].map(f => ({ [f]: { contains: String(q.q) } }));
    const [items, total] = await Promise.all([this.db.crmCustomer.findMany({ where, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take }), this.db.crmCustomer.count({ where })]); return { items, total, page: pg.page, pageSize: pg.pageSize };
  }
  async customer(u: AuthUser, id: string) { const c = await this.db.crmCustomer.findFirst({ where: { id, tenantId: tenant(u), ...own(u) }, include: { deals: { orderBy: { createdAt: "desc" } }, activities: { orderBy: { createdAt: "desc" }, take: 50 } } }); if (!c) throw new NotFoundException(); return c; }
  async addCustomer(u: AuthUser, d: any) { const { ownerId, ...r } = d; return this.db.crmCustomer.create({ data: { ...r, tenantId: tenant(u), ownerId: await this.ownerOf(u, ownerId) } }); }
  async editCustomer(u: AuthUser, id: string, d: any) { const { ownerId, ...r } = d; const x = await this.db.crmCustomer.updateMany({ where: { id, tenantId: tenant(u), ...own(u) }, data: { ...r, ...(ownerId ? { ownerId: await this.ownerOf(u, ownerId) } : {}) } }); if (!x.count) throw new NotFoundException(); return { ok: true }; }

  // ---- deals ----
  deals(u: AuthUser) {
    return this.db.crmDeal.findMany({ where: { tenantId: tenant(u), ...own(u), OR: [{ stage: { notIn: ["WON", "LOST"] } }, { closedAt: { gte: new Date(Date.now() - 90 * 864e5) } }] }, include: { customer: { select: { name: true, company: true } } }, orderBy: { updatedAt: "desc" }, take: 500 });
  }
  async addDeal(u: AuthUser, d: any) {
    const t = tenant(u); if (!(await this.db.crmCustomer.count({ where: { id: d.customerId, tenantId: t, ...own(u) } }))) throw new BadRequestException("Invalid customer");
    const { ownerId, expectedClose, ...r } = d; const closed = ["WON", "LOST"].includes(d.stage);
    return this.db.crmDeal.create({ data: { ...r, tenantId: t, ownerId: await this.ownerOf(u, ownerId), expectedClose: dt(expectedClose), closedAt: closed ? new Date() : null } });
  }
  async editDeal(u: AuthUser, id: string, d: any) {
    const cur = await this.db.crmDeal.findFirst({ where: { id, tenantId: tenant(u), ...own(u) } }); if (!cur) throw new NotFoundException();
    const { ownerId, expectedClose, ...r } = d, data: any = { ...r, ...(expectedClose !== undefined ? { expectedClose: dt(expectedClose) } : {}), ...(ownerId ? { ownerId: await this.ownerOf(u, ownerId) } : {}) };
    if (d.stage && d.stage !== cur.stage) { data.closedAt = ["WON", "LOST"].includes(d.stage) ? new Date() : null; if (d.stage !== "LOST") data.lostReason = null; }
    const x = await this.db.crmDeal.update({ where: { id }, data }); if (d.stage && d.stage !== cur.stage) { await this.note(u, undefined, id, `Stage: ${cur.stage} → ${d.stage}`); if (d.stage === "WON" || d.stage === "LOST") await this.log(u, "CRM_DEAL_" + d.stage, id, { value: String(cur.value) }); } return x;
  }
  async delDeal(u: AuthUser, id: string) { const r = await this.db.crmDeal.deleteMany({ where: { id, tenantId: tenant(u), ...own(u) } }); if (!r.count) throw new NotFoundException(); await this.log(u, "CRM_DEAL_DELETED", id); return { ok: true }; }

  // ---- activities / tasks ----
  activities(u: AuthUser, q: any) {
    return this.db.crmActivity.findMany({ where: { tenantId: tenant(u), kind: q.notes ? undefined : { not: "NOTE" }, ...(manage(u) && q.all ? {} : { ownerId: u.sub }), ...(q.status === "open" ? { doneAt: null } : q.status === "done" ? { doneAt: { not: null } } : {}),
      ...(q.leadId ? { leadId: q.leadId } : {}), ...(q.customerId ? { customerId: q.customerId } : {}), ...(q.dealId ? { dealId: q.dealId } : {}) }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }], take: 200 });
  }
  async addActivity(u: AuthUser, d: any) {
    const t = tenant(u);
    for (const [k, m] of [["leadId", "crmLead"], ["customerId", "crmCustomer"], ["dealId", "crmDeal"]] as const) if (d[k] && !(await (this.db as any)[m].count({ where: { id: d[k], tenantId: t, ...own(u) } }))) throw new BadRequestException(`Invalid ${k}`);
    const { ownerId, dueAt, ...r } = d; return this.db.crmActivity.create({ data: { ...r, tenantId: t, ownerId: await this.ownerOf(u, ownerId), createdById: u.sub, dueAt: dt(dueAt) } });
  }
  async complete(u: AuthUser, id: string) { const r = await this.db.crmActivity.updateMany({ where: { id, tenantId: tenant(u), ...(manage(u) ? {} : { ownerId: u.sub }), doneAt: null }, data: { doneAt: new Date() } }); if (!r.count) throw new NotFoundException(); return { ok: true }; }
  async delActivity(u: AuthUser, id: string) { const r = await this.db.crmActivity.deleteMany({ where: { id, tenantId: tenant(u), ...(manage(u) ? {} : { ownerId: u.sub }) } }); if (!r.count) throw new NotFoundException(); return { ok: true }; }

  // ---- targets & reports ----
  targets(u: AuthUser, month: string) { return this.db.crmTarget.findMany({ where: { tenantId: tenant(u), month, ...(manage(u) ? {} : { userId: u.sub }) } }); }
  async setTarget(u: AuthUser, d: any) {
    const t = tenant(u); if (!(await this.db.user.count({ where: { id: d.userId, tenantId: t } }))) throw new BadRequestException("Invalid user");
    await this.log(u, "CRM_TARGET_SET", d.userId, d); return this.db.crmTarget.upsert({ where: { tenantId_userId_month: { tenantId: t, userId: d.userId, month: d.month } }, create: { tenantId: t, ...d }, update: { amount: d.amount } });
  }
  async reports(u: AuthUser, q: any) {
    const t = tenant(u), to = q.to ? new Date(q.to + "T23:59:59Z") : new Date(), from = q.from ? new Date(q.from + "T00:00:00Z") : new Date(+to - 30 * 864e5), inR = (d: Date | null) => !!d && d >= from && d <= to;
    const [leads, deals, users, targets] = await Promise.all([
      this.db.crmLead.findMany({ where: { tenantId: t, ...own(u), createdAt: { gte: from, lte: to } }, select: { status: true, source: true, ownerId: true }, take: 20000 }),
      this.db.crmDeal.findMany({ where: { tenantId: t, ...own(u) }, select: { stage: true, value: true, ownerId: true, closedAt: true }, take: 20000 }),
      this.db.user.findMany({ where: { tenantId: t }, select: { id: true, name: true } }), this.db.crmTarget.findMany({ where: { tenantId: t, month: to.toISOString().slice(0, 7) } }) ]);
    const group = <T,>(rows: T[], key: (r: T) => string) => { const m = new Map<string, T[]>(); rows.forEach(r => m.set(key(r), [...(m.get(key(r)) ?? []), r])); return m; };
    const dv = deals.map(d => ({ ...d, value: Number(d.value) })), won = dv.filter(d => d.stage === "WON" && inR(d.closedAt)), lost = dv.filter(d => d.stage === "LOST" && inR(d.closedAt)), converted = leads.filter(l => l.status === "CONVERTED").length;
    const name = (id: string) => users.find(x => x.id === id)?.name ?? "—", sum = (a: { value: number }[]) => a.reduce((x, d) => x + d.value, 0);
    const owners = new Set([...leads.map(l => l.ownerId), ...dv.map(d => d.ownerId)]);
    return { range: { from, to }, leads: { total: leads.length, converted, conversionRate: rate(converted, leads.length), bySource: [...group(leads, l => l.source)].map(([source, r]) => ({ source, count: r.length, converted: r.filter(x => x.status === "CONVERTED").length })), byStatus: [...group(leads, l => l.status)].map(([status, r]) => ({ status, count: r.length })) },
      pipeline: { open: dv.filter(d => !["WON", "LOST"].includes(d.stage)).length, openValue: sum(dv.filter(d => !["WON", "LOST"].includes(d.stage))), weightedValue: weighted(dv), byStage: [...group(dv, d => d.stage)].map(([stage, r]) => ({ stage, count: r.length, value: sum(r) })) },
      won: { count: won.length, value: sum(won) }, lost: { count: lost.length, value: sum(lost) }, winRate: rate(won.length, won.length + lost.length),
      team: [...owners].map(id => { const w = won.filter(d => d.ownerId === id), tg = Number(targets.find(x => x.userId === id)?.amount ?? 0); return { userId: id, name: name(id), leads: leads.filter(l => l.ownerId === id).length, converted: leads.filter(l => l.ownerId === id && l.status === "CONVERTED").length, dealsWon: w.length, wonValue: sum(w), openValue: sum(dv.filter(d => d.ownerId === id && !["WON", "LOST"].includes(d.stage))), target: tg, achievement: tg ? rate(sum(w), tg) : null }; }).sort((a, b) => b.wonValue - a.wonValue) };
  }
}
