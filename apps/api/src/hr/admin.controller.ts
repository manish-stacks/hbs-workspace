import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Put } from "@nestjs/common";
import { ArrayMaxSize, IsArray, IsOptional, IsString, MinLength } from "class-validator";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser, CurrentUser, RequirePerms } from "../common/auth.types";
import { ALL_PERMISSIONS } from "../common/permissions";
import { scope } from "./scope";

class CompanyDto { @IsOptional() @IsString() @MinLength(2) name?: string; @IsOptional() @IsString() gstin?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsString() address?: string; @IsOptional() @IsString() timezone?: string }
class BranchPatch { @IsOptional() @IsString() @MinLength(2) name?: string; @IsOptional() @IsString() address?: string }
class NameDto { @IsString() @MinLength(2) name: string }
class RoleDto { @IsString() @MinLength(2) name: string; @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) permissions: string[] }
class AccessDto { @IsArray() @IsString({ each: true }) roleIds: string[]; @IsOptional() @IsString() branchId?: string; @IsOptional() @IsString() departmentId?: string }
const tid = (u: AuthUser) => scope({ ...u, branchId: null, departmentId: null }).tenantId;

@Controller()
export class AdminController {
  constructor(private db: PrismaService) {}
  private audit(u: AuthUser, action: string, entity?: string) { return this.db.auditLog.create({ data: { tenantId: tid(u), actorId: u.sub, action, entity } }); }

  // ---- company ----
  @RequirePerms("company:view") @Get("company") company(@CurrentUser() u: AuthUser) { return this.db.company.findUnique({ where: { tenantId: tid(u) } }); }
  @RequirePerms("company:edit") @Patch("company") async editCompany(@CurrentUser() u: AuthUser, @Body() d: CompanyDto) { const c = await this.db.company.update({ where: { tenantId: tid(u) }, data: d }); await this.audit(u, "COMPANY_UPDATED"); return c; }

  // ---- branches ----
  @RequirePerms("branch:edit") @Patch("branches/:id")
  async editBranch(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: BranchPatch) {
    const r = await this.db.branch.updateMany({ where: { id, tenantId: tid(u), deletedAt: null }, data: d }); if (!r.count) throw new NotFoundException(); return { ok: true };
  }
  @RequirePerms("branch:delete") @Delete("branches/:id")
  async delBranch(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    const b = await this.db.branch.findFirst({ where: { id, tenantId: tid(u), deletedAt: null } }); if (!b) throw new NotFoundException();
    if (await this.db.employee.count({ where: { branchId: id, status: "ACTIVE" } })) throw new BadRequestException("Transfer active employees out of this branch first");
    await this.db.branch.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, code: `${b.code}~${Date.now()}` } }); await this.audit(u, "BRANCH_DELETED", id); return { ok: true };
  }

  // ---- departments / designations ----
  @RequirePerms("department:edit") @Patch("departments/:id")
  async editDept(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: NameDto) { const r = await this.db.department.updateMany({ where: { id, tenantId: tid(u) }, data: d }); if (!r.count) throw new NotFoundException(); return { ok: true }; }
  @RequirePerms("department:delete") @Delete("departments/:id")
  async delDept(@CurrentUser() u: AuthUser, @Param("id") id: string) { const r = await this.db.department.deleteMany({ where: { id, tenantId: tid(u) } }); if (!r.count) throw new NotFoundException(); await this.audit(u, "DEPARTMENT_DELETED", id); return { ok: true }; }
  @RequirePerms("employee:view") @Get("designations") designations(@CurrentUser() u: AuthUser) { return this.db.designation.findMany({ where: { tenantId: tid(u) }, orderBy: { name: "asc" } }); }
  @RequirePerms("employee:create") @Post("designations") addDesig(@CurrentUser() u: AuthUser, @Body() d: NameDto) { return this.db.designation.create({ data: { name: d.name, tenantId: tid(u) } }); }
  @RequirePerms("employee:delete") @Delete("designations/:id")
  async delDesig(@CurrentUser() u: AuthUser, @Param("id") id: string) { const r = await this.db.designation.deleteMany({ where: { id, tenantId: tid(u) } }); if (!r.count) throw new NotFoundException(); return { ok: true }; }

  // ---- roles & permissions ----
  @RequirePerms("role:view") @Get("permissions") perms() { return ALL_PERMISSIONS; }
  @RequirePerms("role:view") @Get("roles")
  async roles(@CurrentUser() u: AuthUser) {
    const rs = await this.db.role.findMany({ where: { tenantId: tid(u) }, include: { permissions: { include: { permission: true } } }, orderBy: { name: "asc" } });
    return rs.map(r => ({ id: r.id, name: r.name, isSystem: r.isSystem, permissions: r.permissions.map(p => p.permission.code) }));
  }
  private async permIds(u: AuthUser, codes: string[]) {
    for (const c of codes) { if (!ALL_PERMISSIONS.includes(c)) throw new BadRequestException(`Unknown permission ${c}`);
      if (!u.perms.includes(c)) throw new ForbiddenException(`You cannot grant a permission you do not hold: ${c}`); }
    return (await this.db.permission.findMany({ where: { code: { in: codes } } })).map(p => ({ permissionId: p.id }));
  }
  @RequirePerms("role:create") @Post("roles")
  async addRole(@CurrentUser() u: AuthUser, @Body() d: RoleDto) {
    const r = await this.db.role.create({ data: { tenantId: tid(u), name: d.name, permissions: { create: await this.permIds(u, d.permissions) } } });
    await this.audit(u, "ROLE_CREATED", r.id); return { id: r.id };
  }
  @RequirePerms("role:edit") @Patch("roles/:id")
  async editRole(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: RoleDto) {
    const r = await this.db.role.findFirst({ where: { id, tenantId: tid(u) } }); if (!r) throw new NotFoundException();
    if (r.isSystem) throw new ForbiddenException("System roles cannot be edited; create a custom role");
    const create = await this.permIds(u, d.permissions);
    await this.db.$transaction([this.db.rolePermission.deleteMany({ where: { roleId: id } }), this.db.role.update({ where: { id }, data: { name: d.name, permissions: { create } } })]);
    await this.audit(u, "ROLE_UPDATED", id); return { ok: true };
  }
  @RequirePerms("role:delete") @Delete("roles/:id")
  async delRole(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    const r = await this.db.role.findFirst({ where: { id, tenantId: tid(u) } }); if (!r) throw new NotFoundException();
    if (r.isSystem) throw new ForbiddenException("System roles cannot be deleted");
    await this.db.role.delete({ where: { id } }); await this.audit(u, "ROLE_DELETED", id); return { ok: true };
  }

  // ---- users & access ----
  @RequirePerms("role:view") @Get("users")
  async users(@CurrentUser() u: AuthUser) {
    const us = await this.db.user.findMany({ where: { tenantId: tid(u) }, include: { roles: true }, orderBy: { createdAt: "asc" } });
    return us.map(x => ({ id: x.id, name: x.name, email: x.email, status: x.status, branchId: x.branchId, departmentId: x.departmentId, roleIds: x.roles.map(r => r.roleId) }));
  }
  @RequirePerms("role:manage") @Put("users/:id/access")
  async access(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: AccessDto) {
    const t = tid(u);
    const user = await this.db.user.findFirst({ where: { id, tenantId: t } }); if (!user) throw new NotFoundException();
    const roles = await this.db.role.findMany({ where: { id: { in: d.roleIds }, tenantId: t } });
    if (roles.length !== d.roleIds.length) throw new BadRequestException("Invalid role");
    for (const r of roles) { if (r.name === "Company Owner" && !u.roles.includes("Company Owner")) throw new ForbiddenException("Only an owner can assign Owner");
      const granted = await this.db.rolePermission.findMany({ where: { roleId: r.id }, include: { permission: true } });
      if (granted.some(g => !u.perms.includes(g.permission.code))) throw new ForbiddenException("Role exceeds your own permissions"); }
    for (const [model, v] of [["branch", d.branchId], ["department", d.departmentId]] as const)
      if (v && !(await (this.db as any)[model].count({ where: { id: v, tenantId: t } }))) throw new BadRequestException(`Invalid ${model}`);
    await this.db.$transaction([this.db.userRole.deleteMany({ where: { userId: id } }),
      this.db.user.update({ where: { id }, data: { branchId: d.branchId || null, departmentId: d.departmentId || null, roles: { create: d.roleIds.map(roleId => ({ roleId })) } } })]);
    await this.audit(u, "USER_ACCESS_CHANGED", id); return { ok: true };
  }
}
