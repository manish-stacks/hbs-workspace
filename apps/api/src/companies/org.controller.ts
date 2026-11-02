import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsOptional, IsString, MinLength } from "class-validator";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser, CurrentUser, RequirePerms, SuperAdminOnly } from "../common/auth.types";

class BranchDto { @IsString() @MinLength(2) name: string; @IsString() @MinLength(2) code: string; @IsOptional() @IsString() address?: string }
class NameDto { @IsString() @MinLength(2) name: string }
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
    const b = await this.db.branch.create({ data: { ...d, tenantId: tid(u) } });
    await this.db.auditLog.create({ data: { tenantId: tid(u), actorId: u.sub, action: "BRANCH_CREATED", entity: b.id } });
    return b;
  }
  @RequirePerms("department:view") @Get("departments")
  departments(@CurrentUser() u: AuthUser) { return this.db.department.findMany({ where: { tenantId: tid(u), deletedAt: null } }); }
  @RequirePerms("department:create") @Post("departments")
  addDept(@CurrentUser() u: AuthUser, @Body() d: NameDto) { return this.db.department.create({ data: { name: d.name, tenantId: tid(u) } }); }

  @SuperAdminOnly() @Get("super-admin/companies")
  companies() { return this.db.tenant.findMany({ include: { company: true, _count: { select: { users: true, branches: true } } }, orderBy: { createdAt: "desc" } }); }
}
