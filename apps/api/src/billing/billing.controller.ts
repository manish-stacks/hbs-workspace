import { Body, Controller, Get, Headers, Param, Patch, Post, Req } from "@nestjs/common";
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser, CurrentUser, Public, RequirePerms, SuperAdminOnly } from "../common/auth.types";
import { BillingService } from "./billing.service";

class CheckoutDto { @IsString() planId: string; @IsIn(["MONTHLY", "YEARLY"]) cycle: "MONTHLY" | "YEARLY" }
class VerifyDto { @IsString() orderId: string; @IsString() paymentId: string; @IsString() signature: string }
class PlanDto {
  @IsString() code: string; @IsString() name: string;
  @IsNumber() @Min(0) monthlyPrice: number; @IsNumber() @Min(0) yearlyPrice: number;
  @IsInt() @Min(1) maxEmployees: number; @IsInt() @Min(1) maxBranches: number; @IsInt() @Min(0) trialDays: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class PlanPatch {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() @Min(0) monthlyPrice?: number; @IsOptional() @IsNumber() @Min(0) yearlyPrice?: number;
  @IsOptional() @IsInt() @Min(1) maxEmployees?: number; @IsOptional() @IsInt() @Min(1) maxBranches?: number; @IsOptional() @IsInt() @Min(0) trialDays?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class StatusDto { @IsIn(["ACTIVE", "SUSPENDED", "INACTIVE"]) status: "ACTIVE" | "SUSPENDED" | "INACTIVE" }

@Controller()
export class BillingController {
  constructor(private s: BillingService, private db: PrismaService) {}
  @Public() @Get("plans") plans() { return this.db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { monthlyPrice: "asc" } }); }
  @Get("billing/subscription") sub(@CurrentUser() u: AuthUser) { return this.s.subscription(u.tenantId!); }
  @RequirePerms("setting:manage") @Post("billing/checkout") checkout(@CurrentUser() u: AuthUser, @Body() d: CheckoutDto) { return this.s.checkout(u.tenantId!, d.planId, d.cycle); }
  @RequirePerms("setting:manage") @Post("billing/verify") verify(@CurrentUser() u: AuthUser, @Body() d: VerifyDto) { return this.s.verify(u.tenantId!, d.orderId, d.paymentId, d.signature); }
  @Public() @Post("webhooks/razorpay")
  hook(@Req() r: any, @Headers("x-razorpay-signature") sig: string, @Headers("x-razorpay-event-id") eid: string) { return this.s.webhook(r.rawBody, sig, eid); }

  // ---- Super Admin ----
  @SuperAdminOnly() @Get("super-admin/plans") allPlans() { return this.db.subscriptionPlan.findMany({ orderBy: { monthlyPrice: "asc" } }); }
  @SuperAdminOnly() @Post("super-admin/plans") addPlan(@Body() d: PlanDto) { return this.db.subscriptionPlan.create({ data: d }); }
  @SuperAdminOnly() @Patch("super-admin/plans/:id") editPlan(@Param("id") id: string, @Body() d: PlanPatch) { return this.db.subscriptionPlan.update({ where: { id }, data: d }); }
  @SuperAdminOnly() @Patch("super-admin/companies/:id/status")
  async status(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: StatusDto) {
    const t = await this.db.tenant.update({ where: { id }, data: { status: d.status } });
    await this.db.auditLog.create({ data: { tenantId: id, actorId: u.sub, action: "COMPANY_STATUS_" + d.status } });
    return t;
  }
  @SuperAdminOnly() @Get("super-admin/payments")
  payments() { return this.db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { tenant: { include: { company: true } }, plan: true } }); }
  @SuperAdminOnly() @Get("super-admin/stats")
  async stats() {
    const [byStatus, employees, branches, paid, failed, subs, newReg] = await Promise.all([
      this.db.tenant.groupBy({ by: ["status"], _count: true }), this.db.user.count({ where: { tenantId: { not: null } } }), this.db.branch.count({ where: { deletedAt: null } }),
      this.db.payment.aggregate({ where: { status: "PAID" }, _count: true, _sum: { amount: true } }), this.db.payment.count({ where: { status: "FAILED" } }),
      this.db.subscription.findMany({ where: { status: "ACTIVE" }, include: { plan: true } }),
      this.db.tenant.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 864e5) } } }) ]);
    const mrr = subs.reduce((a, s) => a + (s.cycle === "YEARLY" ? Number(s.plan.yearlyPrice) / 12 : Number(s.plan.monthlyPrice)), 0);
    const cnt = (s: string) => byStatus.find(b => b.status === s)?._count ?? 0;
    const soon = new Date(Date.now() + 7 * 864e5);
    return { companies: byStatus.reduce((a, b) => a + b._count, 0), active: cnt("ACTIVE"), suspended: cnt("SUSPENDED"), employees, branches,
      mrr: Math.round(mrr), arr: Math.round(mrr * 12), transactions: paid._count + failed, successful: paid._count, failed, revenue: Number(paid._sum.amount ?? 0), newRegistrations30d: newReg,
      upcomingRenewals: await this.db.subscription.count({ where: { status: "ACTIVE", currentPeriodEnd: { lte: soon, gte: new Date() } } }),
      expired: await this.db.subscription.count({ where: { status: { in: ["EXPIRED", "PAST_DUE"] } } }) };
  }
}
