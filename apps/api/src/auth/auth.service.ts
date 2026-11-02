import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { ROLE_PRESETS } from "../common/permissions";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

@Injectable()
export class AuthService {
  constructor(private db: PrismaService, private jwt: JwtService) {}

  private async claims(userId: string, extra: Partial<AuthUser> = {}): Promise<AuthUser> {
    const u = await this.db.user.findUniqueOrThrow({ where: { id: userId },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    const perms = [...new Set(u.roles.flatMap(r => r.role.permissions.map(p => p.permission.code)))];
    return { sub: u.id, tenantId: u.tenantId, isSuperAdmin: u.isSuperAdmin, branchId: u.branchId, departmentId: u.departmentId, roles: u.roles.map(r => r.role.name), perms, ...extra };
  }
  private sign(c: AuthUser, ttl?: string) { return this.jwt.sign({ ...c }, ttl ? { expiresIn: ttl } : {}); }

  private async issue(userId: string, tenantId: string | null, familyId = randomUUID()) {
    const raw = randomBytes(48).toString("hex");
    const days = Number(process.env.REFRESH_TTL_DAYS || 30);
    await this.db.refreshToken.create({ data: { userId, tenantId, familyId, tokenHash: sha(raw), expiresAt: new Date(Date.now() + days * 864e5) } });
    return { accessToken: this.sign(await this.claims(userId)), refreshToken: raw };
  }

  async registerCompany(d: { companyName: string; name: string; email: string; password: string }) {
    if (await this.db.user.findUnique({ where: { email: d.email } })) throw new ConflictException("Email already registered");
    const slug = d.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + randomBytes(2).toString("hex");
    const hash = await bcrypt.hash(d.password, 12);
    const user = await this.db.$transaction(async tx => {
      const t = await tx.tenant.create({ data: { slug, company: { create: { name: d.companyName } } } });
      const perms = await tx.permission.findMany();
      let ownerRoleId = "";
      for (const [name, codes] of Object.entries(ROLE_PRESETS)) {
        const r = await tx.role.create({ data: { tenantId: t.id, name, isSystem: true,
          permissions: { create: perms.filter(p => codes.includes(p.code)).map(p => ({ permissionId: p.id })) } } });
        if (name === "Company Owner") ownerRoleId = r.id;
      }
      const u = await tx.user.create({ data: { tenantId: t.id, email: d.email, name: d.name, passwordHash: hash, roles: { create: { roleId: ownerRoleId } } } });
      const plan = await tx.subscriptionPlan.findFirst({ where: { code: "STARTER" } });
      if (plan) await tx.subscription.create({ data: { tenantId: t.id, planId: plan.id, status: "TRIAL", trialEndsAt: new Date(Date.now() + plan.trialDays * 864e5) } });
      await tx.auditLog.create({ data: { tenantId: t.id, actorId: u.id, action: "COMPANY_REGISTERED" } });
      return u;
    });
    return this.issue(user.id, user.tenantId);
  }

  async login(email: string, password: string, ip?: string) {
    const u = await this.db.user.findUnique({ where: { email }, include: { tenant: true } });
    if (!u || !(await bcrypt.compare(password, u.passwordHash))) throw new UnauthorizedException("Invalid credentials");
    if (u.status !== "ACTIVE" || (u.tenant && u.tenant.status !== "ACTIVE")) throw new ForbiddenException("Account or company suspended");
    await this.db.auditLog.create({ data: { tenantId: u.tenantId, actorId: u.id, action: "LOGIN", ip } });
    return this.issue(u.id, u.tenantId);
  }

  async refresh(raw: string) {
    const t = await this.db.refreshToken.findUnique({ where: { tokenHash: sha(raw) } });
    if (!t) throw new UnauthorizedException();
    if (t.revokedAt || t.expiresAt < new Date()) {
      await this.db.refreshToken.updateMany({ where: { familyId: t.familyId }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException("Token reuse detected");
    }
    await this.db.refreshToken.update({ where: { id: t.id }, data: { revokedAt: new Date() } });
    return this.issue(t.userId, t.tenantId, t.familyId);
  }

  async logout(raw: string) {
    const t = await this.db.refreshToken.findUnique({ where: { tokenHash: sha(raw) } });
    if (t) await this.db.refreshToken.updateMany({ where: { familyId: t.familyId }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  async me(u: AuthUser) {
    const x = await this.db.user.findUnique({ where: { id: u.sub }, select: { id: true, name: true, email: true, tenantId: true, isSuperAdmin: true } });
    return { ...x, roles: u.roles, perms: u.perms, impersonatedBy: u.impersonatedBy ?? null };
  }

  /** Super Admin opens a company dashboard: audited, 1h, cannot reach super-admin routes. */
  async impersonate(admin: AuthUser, tenantId: string, ip?: string) {
    const t = await this.db.tenant.findUniqueOrThrow({ where: { id: tenantId }, include: { company: true } });
    const owner = await this.db.user.findFirstOrThrow({ where: { tenantId, roles: { some: { role: { name: "Company Owner" } } } } });
    await this.db.auditLog.create({ data: { tenantId, actorId: admin.sub, action: "SUPER_ADMIN_ACCESS", entity: "Tenant", ip,
      meta: { company: t.company?.name, accessedAs: owner.email } } });
    const c = await this.claims(owner.id, { impersonatedBy: admin.sub });
    return { accessToken: this.sign(c, "1h"), company: t.company?.name };
  }
}
