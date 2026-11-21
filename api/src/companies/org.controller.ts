import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser, CurrentUser, RequirePerms, SuperAdminOnly } from "../common/auth.types";
import { ROLE_PRESETS } from "../common/permissions";
import { DEFAULT_LEAVE_TYPES } from "../leaves/leave.logic";

class BranchDto { @IsString() @MinLength(2) name: string; @IsString() @MinLength(2) code: string; @IsOptional() @IsString() address?: string }
class NameDto { @IsString() @MinLength(2) name: string }

class SuperAdminCreateCompanyDto {
  @IsString() @MinLength(2) companyName: string;
  @IsString() @MinLength(2) ownerName: string;
  @IsEmail() ownerEmail: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsString() planId?: string;
  @IsOptional() @IsIn(["ACTIVE", "TRIAL"]) subscriptionStatus?: "ACTIVE" | "TRIAL";
  @IsOptional() @IsInt() @Min(1) durationDays?: number;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() gstin?: string;
}

class SuperAdminEditCompanyDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsIn(["ACTIVE", "SUSPENDED", "INACTIVE"]) status?: "ACTIVE" | "SUSPENDED" | "INACTIVE";
}

const tid = (u: AuthUser) => u.tenantId as string; // tenantId only from the verified JWT

@Controller()
export class OrgController {
  constructor(private db: PrismaService) {}

  @RequirePerms("branch:view") @Get("branches")
  branches(@CurrentUser() u: AuthUser, @Query("q") q = "") {
    return this.db.branch.findMany({ where: { tenantId: tid(u), deletedAt: null, name: { contains: q } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @RequirePerms("branch:create") @Post("branches")
  async addBranch(@CurrentUser() u: AuthUser, @Body() d: BranchDto) {
    const sub = await this.db.subscription.findUnique({ where: { tenantId: tid(u) }, include: { plan: true } });
    if (!sub || sub.status === "EXPIRED" || sub.status === "CANCELLED" || (sub.status === "TRIAL" && sub.trialEndsAt! < new Date())) throw new ForbiddenException("Subscription inactive. Please subscribe.");
    if (await this.db.branch.count({ where: { tenantId: tid(u), deletedAt: null } }) >= sub.plan.maxBranches) throw new ForbiddenException("Branch limit reached for your plan");
    const b = await this.db.branch.create({ data: { ...d, tenantId: tid(u) } });
    await this.db.auditLog.create({ data: { tenantId: tid(u), actorId: u.sub, action: "BRANCH_CREATED", entity: b.id } });
    return b;
  }

  @RequirePerms("department:view") @Get("departments")
  departments(@CurrentUser() u: AuthUser) { return this.db.department.findMany({ where: { tenantId: tid(u), deletedAt: null } }); }

  @RequirePerms("department:create") @Post("departments")
  addDept(@CurrentUser() u: AuthUser, @Body() d: NameDto) { return this.db.department.create({ data: { name: d.name, tenantId: tid(u) } }); }

  // ---- Super Admin Operations ----
  @SuperAdminOnly() @Get("super-admin/companies")
  companies() {
    return this.db.tenant.findMany({
      include: {
        company: true,
        subscription: { include: { plan: true } },
        _count: { select: { users: true, branches: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  @SuperAdminOnly() @Post("super-admin/companies")
  async createCompany(@CurrentUser() u: AuthUser, @Body() d: SuperAdminCreateCompanyDto) {
    if (await this.db.user.findUnique({ where: { email: d.ownerEmail } })) {
      throw new ConflictException("Owner email already registered in system");
    }

    const slug = d.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + randomBytes(2).toString("hex");
    const password = d.password || "Password@123";
    const hash = await bcrypt.hash(password, 12);
    const perms = await this.db.permission.findMany();
    
    // Determine plan
    let plan = d.planId ? await this.db.subscriptionPlan.findUnique({ where: { id: d.planId } }) : null;
    if (!plan) plan = await this.db.subscriptionPlan.findFirst({ where: { code: "STARTER" } });
    if (!plan) plan = await this.db.subscriptionPlan.findFirst();

    const subStatus = d.subscriptionStatus || "ACTIVE";
    const durationDays = d.durationDays || (subStatus === "TRIAL" ? (plan?.trialDays || 14) : 365);
    const periodEnd = new Date(Date.now() + durationDays * 864e5);

    const result = await this.db.$transaction(async tx => {
      const t = await tx.tenant.create({
        data: {
          slug,
          status: "ACTIVE",
          company: {
            create: {
              name: d.companyName,
              phone: d.phone,
              address: d.address,
              gstin: d.gstin,
              timezone: "Asia/Kolkata"
            }
          }
        }
      });

      let ownerRoleId = "";
      for (const [name, codes] of Object.entries(ROLE_PRESETS)) {
        const r = await tx.role.create({
          data: {
            tenantId: t.id,
            name,
            isSystem: true,
            permissions: { create: perms.filter(p => codes.includes(p.code)).map(p => ({ permissionId: p.id })) }
          }
        });
        if (name === "Company Owner") ownerRoleId = r.id;
      }

      await tx.leaveType.createMany({ data: DEFAULT_LEAVE_TYPES.map(x => ({ ...x, tenantId: t.id })) });

      // Create primary Branch
      const branch = await tx.branch.create({
        data: {
          tenantId: t.id,
          name: "Main HQ",
          code: "HQ-01",
          address: d.address || "Headquarters"
        }
      });

      // Create owner user
      const owner = await tx.user.create({
        data: {
          tenantId: t.id,
          email: d.ownerEmail,
          name: d.ownerName,
          passwordHash: hash,
          branchId: branch.id,
          roles: { create: { roleId: ownerRoleId } }
        }
      });

      // Create subscription with selected plan
      if (plan) {
        await tx.subscription.create({
          data: {
            tenantId: t.id,
            planId: plan.id,
            status: subStatus,
            cycle: durationDays > 40 ? "YEARLY" : "MONTHLY",
            currentPeriodEnd: periodEnd,
            trialEndsAt: subStatus === "TRIAL" ? periodEnd : null
          }
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: t.id,
          actorId: u.sub,
          action: "SUPER_ADMIN_COMPANY_CREATED",
          meta: { companyName: d.companyName, ownerEmail: d.ownerEmail, plan: plan?.name, status: subStatus }
        }
      });

      return { tenantId: t.id, ownerId: owner.id };
    }, { timeout: 25000, maxWait: 10000 });

    return {
      ok: true,
      ...result,
      companyName: d.companyName,
      ownerEmail: d.ownerEmail,
      tempPassword: password,
      planName: plan?.name
    };
  }

  @SuperAdminOnly() @Patch("super-admin/companies/:id")
  async editCompany(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: SuperAdminEditCompanyDto) {
    const t = await this.db.tenant.findUnique({ where: { id }, include: { company: true } });
    if (!t) throw new NotFoundException("Company not found");

    if (d.status) {
      await this.db.tenant.update({ where: { id }, data: { status: d.status } });
    }

    const compData: any = {};
    if (d.name) compData.name = d.name;
    if (d.phone !== undefined) compData.phone = d.phone;
    if (d.address !== undefined) compData.address = d.address;
    if (d.gstin !== undefined) compData.gstin = d.gstin;
    if (d.timezone !== undefined) compData.timezone = d.timezone;

    if (Object.keys(compData).length > 0) {
      await this.db.company.update({ where: { tenantId: id }, data: compData });
    }

    await this.db.auditLog.create({ data: { tenantId: id, actorId: u.sub, action: "SUPER_ADMIN_COMPANY_UPDATED" } });
    return { ok: true };
  }
}
