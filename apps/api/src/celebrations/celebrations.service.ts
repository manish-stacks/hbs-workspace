import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { scope } from "../hr/scope";
import { localDate } from "../attendance/util";
import { MailService, NotificationService } from "./infra";
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES, nextOccurrence, render } from "./logic";

const tenant = (u: AuthUser) => scope({ ...u, branchId: null, departmentId: null }).tenantId;
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

@Injectable()
export class CelebrationService {
  constructor(private db: PrismaService, private notes: NotificationService, private mail: MailService) {}
  async settings(t: string) { const r = await this.db.companySetting.findUnique({ where: { tenantId_key: { tenantId: t, key: "celebrations" } } }); return { ...DEFAULT_SETTINGS, ...((r?.value as any) ?? {}) }; }
  getSettings(u: AuthUser) { return this.settings(tenant(u)); }
  async putSettings(u: AuthUser, v: any) { const t = tenant(u), value = { ...DEFAULT_SETTINGS, ...v };
    await this.db.companySetting.upsert({ where: { tenantId_key: { tenantId: t, key: "celebrations" } }, create: { tenantId: t, key: "celebrations", value }, update: { value } }); return value; }
  async templates(u: AuthUser) { const rows = await this.db.celebrationTemplate.findMany({ where: { tenantId: tenant(u) } }); return Object.fromEntries(["BIRTHDAY", "ANNIVERSARY"].map(k => [k, rows.find(r => r.kind === k) ?? DEFAULT_TEMPLATES[k]])); }
  async putTemplate(u: AuthUser, d: any) { const t = tenant(u); return this.db.celebrationTemplate.upsert({ where: { tenantId_kind: { tenantId: t, kind: d.kind } }, create: { tenantId: t, ...d }, update: { subject: d.subject, body: d.body } }); }
  history(u: AuthUser) { return this.db.celebrationEvent.findMany({ where: { tenantId: tenant(u) }, include: { employee: { select: { fullName: true } }, logs: true }, orderBy: { createdAt: "desc" }, take: 100 }); }

  /** Dashboard/calendar data. Exposes name + day/month only (never birth year). */
  async upcoming(u: AuthUser, days: number) {
    const t = tenant(u), today = localDate(new Date(), (await this.db.company.findUnique({ where: { tenantId: t } }))?.timezone ?? "Asia/Kolkata"), n = Math.min(Math.max(days || 30, 1), 366);
    const emps = await this.db.employee.findMany({ where: { tenantId: t, status: "ACTIVE" }, select: { id: true, fullName: true, photoUrl: true, dob: true, joiningDate: true }, take: 5000 });
    const out: { birthdays: any[]; anniversaries: any[] } = { birthdays: [], anniversaries: [] };
    for (const e of emps) {
      if (e.dob) { const nx = nextOccurrence(e.dob, today), away = Math.round((+nx - +today) / 864e5); if (away <= n) out.birthdays.push({ id: e.id, name: e.fullName, photoUrl: e.photoUrl, date: nx.toISOString().slice(0, 10), daysAway: away }); }
      const nx = nextOccurrence(e.joiningDate, today), away = Math.round((+nx - +today) / 864e5), years = nx.getUTCFullYear() - e.joiningDate.getUTCFullYear();
      if (years >= 1 && away <= n) out.anniversaries.push({ id: e.id, name: e.fullName, photoUrl: e.photoUrl, date: nx.toISOString().slice(0, 10), daysAway: away, years });
    }
    const by = (a: any, b: any) => a.daysAway - b.daysAway || a.name.localeCompare(b.name); out.birthdays.sort(by); out.anniversaries.sort(by); return out;
  }

  /** Hourly job. Idempotent: unique (employee, kind, year) means a wish is never sent twice. */
  async runDaily(opts: { tenantId?: string; force?: boolean } = {}) {
    const tenants = await this.db.tenant.findMany({ where: { status: "ACTIVE", ...(opts.tenantId ? { id: opts.tenantId } : {}) }, include: { company: true } });
    const total = { birthdays: 0, anniversaries: 0, tenants: 0 };
    for (const t of tenants) { const tz = t.company?.timezone ?? "Asia/Kolkata", cfg = await this.settings(t.id), hour = +new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date());
      if (!opts.force && hour < cfg.hour) continue; const r = await this.runTenant(t.id, t.company?.name ?? "", localDate(new Date(), tz), cfg); total.birthdays += r.BIRTHDAY; total.anniversaries += r.ANNIVERSARY; total.tenants++; }
    return total;
  }
  private async runTenant(t: string, company: string, today: Date, cfg: any) {
    const tpl = await this.db.celebrationTemplate.findMany({ where: { tenantId: t } }), y = today.getUTCFullYear(), m = today.getUTCMonth() + 1, d = today.getUTCDate(), res = { BIRTHDAY: 0, ANNIVERSARY: 0 };
    const pairs = [[m, d], ...(m === 2 && d === 28 && !leap(y) ? [[2, 29]] : [])];
    for (const kind of ["BIRTHDAY", "ANNIVERSARY"] as const) {
      if (!(kind === "BIRTHDAY" ? cfg.birthdayEnabled : cfg.anniversaryEnabled)) continue;
      const col = Prisma.raw(kind === "BIRTHDAY" ? "dob" : "joiningDate"), extra = kind === "ANNIVERSARY" ? Prisma.sql`AND YEAR(joiningDate) < ${y}` : Prisma.empty, ids = new Set<string>();
      for (const [mm, dd] of pairs) for (const r of await this.db.$queryRaw<{ id: string }[]>`SELECT id FROM Employee WHERE tenantId = ${t} AND status = 'ACTIVE' AND ${col} IS NOT NULL AND MONTH(${col}) = ${mm} AND DAY(${col}) = ${dd} ${extra}`) ids.add(r.id);
      const t0 = tpl.find(x => x.kind === kind) ?? DEFAULT_TEMPLATES[kind];
      for (const id of ids) { const e = await this.db.employee.findUnique({ where: { id } }); if (!e) continue;
        const years = kind === "ANNIVERSARY" ? y - e.joiningDate.getUTCFullYear() : undefined; if (years !== undefined && cfg.milestones.length && !cfg.milestones.includes(years)) continue;
        let ev; try { ev = await this.db.celebrationEvent.create({ data: { tenantId: t, employeeId: id, kind, year: y, years } }); } catch (x: any) { if (x.code === "P2002") continue; throw x; }
        const v = { name: e.fullName, years: String(years ?? ""), company }, subject = render(t0.subject, v), body = render(t0.body, v), what = kind === "BIRTHDAY" ? "birthday 🎂" : `${years}-year work anniversary 🎉`;
        if (cfg.inApp) { const users = cfg.announceToCompany ? (await this.db.user.findMany({ where: { tenantId: t, status: "ACTIVE" }, select: { id: true } })).map(u => u.id) : [];
          await this.notes.notify(t, e.userId ? [e.userId] : [], { type: "CELEBRATION", title: subject, body, link: "/employee/notifications" });
          await this.notes.notify(t, users.filter(u => u !== e.userId), { type: "CELEBRATION", title: `Today is ${e.fullName}'s ${what}`, body: "Send your wishes!", link: "/employee/notifications" });
          await this.db.celebrationLog.create({ data: { eventId: ev.id, channel: "IN_APP", status: "SENT", detail: `${users.length} recipients` } }); }
        if (cfg.email && e.email) { const log = await this.db.celebrationLog.create({ data: { eventId: ev.id, channel: "EMAIL", status: "PENDING" } }); await this.mail.deliver({ to: e.email, subject, text: body, logId: log.id }); }
        res[kind]++; }
    }
    return res;
  }
  async runNow(u: AuthUser) { return this.runDaily({ tenantId: tenant(u), force: true }); }
}
