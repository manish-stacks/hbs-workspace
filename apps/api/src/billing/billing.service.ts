import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createOrder, hmacOk } from "./razorpay";

@Injectable()
export class BillingService {
  constructor(private db: PrismaService) {}

  subscription(tenantId: string) { return this.db.subscription.findUnique({ where: { tenantId }, include: { plan: true } }); }

  async checkout(tenantId: string, planId: string, cycle: "MONTHLY" | "YEARLY") {
    const plan = await this.db.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) throw new BadRequestException("Invalid plan");
    const amount = Number(cycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice);
    const order = await createOrder(Math.round(amount * 100), `t_${tenantId.slice(-8)}_${Date.now()}`, { tenantId, planId, cycle });
    if (!order) throw new ServiceUnavailableException("Razorpay not configured (set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
    await this.db.payment.create({ data: { tenantId, planId, cycle, amount, razorpayOrderId: order.id } });
    return { orderId: order.id, amount: Math.round(amount * 100), currency: "INR", keyId: process.env.RAZORPAY_KEY_ID, planName: plan.name };
  }

  async verify(tenantId: string, orderId: string, paymentId: string, signature: string) {
    if (!hmacOk(`${orderId}|${paymentId}`, signature, process.env.RAZORPAY_KEY_SECRET || "")) throw new UnauthorizedException("Invalid payment signature");
    const p = await this.db.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!p || p.tenantId !== tenantId) throw new BadRequestException("Unknown order");
    await this.markPaid(orderId, paymentId);
    return this.subscription(tenantId);
  }

  /** Idempotent: safe for repeated verify calls and duplicate webhooks. */
  async markPaid(orderId: string, paymentId: string) {
    await this.db.$transaction(async tx => {
      const p = await tx.payment.findUnique({ where: { razorpayOrderId: orderId } });
      if (!p || p.status === "PAID") return;
      const end = new Date(Date.now() + (p.cycle === "YEARLY" ? 365 : 30) * 864e5);
      await tx.payment.update({ where: { id: p.id }, data: { status: "PAID", razorpayPaymentId: paymentId, paidAt: new Date(), invoiceNo: `INV-${new Date().getFullYear()}-${p.id.slice(-8).toUpperCase()}` } });
      await tx.subscription.upsert({ where: { tenantId: p.tenantId },
        update: { planId: p.planId, cycle: p.cycle, status: "ACTIVE", currentPeriodEnd: end },
        create: { tenantId: p.tenantId, planId: p.planId, cycle: p.cycle, status: "ACTIVE", currentPeriodEnd: end } });
      await tx.auditLog.create({ data: { tenantId: p.tenantId, action: "PAYMENT_SUCCESS", entity: p.id } });
    });
  }

  async webhook(raw: Buffer, signature: string, eventId: string) {
    if (!hmacOk(raw, signature, process.env.RAZORPAY_WEBHOOK_SECRET || "")) throw new UnauthorizedException("Bad signature");
    const ev = JSON.parse(raw.toString());
    const id = eventId || `${ev.event}:${ev.payload?.payment?.entity?.id}`;
    try { await this.db.webhookEvent.create({ data: { eventId: id, type: ev.event } }); } catch { return { duplicate: true }; }
    const pay = ev.payload?.payment?.entity;
    if (ev.event === "payment.captured" || ev.event === "order.paid") await this.markPaid(pay.order_id, pay.id);
    if (ev.event === "payment.failed") {
      await this.db.payment.updateMany({ where: { razorpayOrderId: pay.order_id, status: "CREATED" }, data: { status: "FAILED" } });
      const p = await this.db.payment.findUnique({ where: { razorpayOrderId: pay.order_id } });
      if (p) await this.db.subscription.updateMany({ where: { tenantId: p.tenantId, status: "ACTIVE" }, data: { status: "PAST_DUE" } });
    }
    return { ok: true };
  }
}
