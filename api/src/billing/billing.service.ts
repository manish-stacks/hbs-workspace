import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import * as dotenv from "dotenv";
import * as path from "path";
import { PrismaService } from "../prisma/prisma.service";
import { createOrder, hmacOk } from "./razorpay";

@Injectable()
export class BillingService {
  constructor(private db: PrismaService) {}

  private reloadEnv() {
    try {
      dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });
      dotenv.config({ path: path.resolve(__dirname, "../../../api/.env"), override: true });
      dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });
      dotenv.config({ path: path.resolve(process.cwd(), "api/.env"), override: true });
    } catch {}
  }

  subscription(tenantId: string) { return this.db.subscription.findUnique({ where: { tenantId }, include: { plan: true } }); }

  history(tenantId: string) {
    return this.db.payment.findMany({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async checkout(tenantId: string, planId: string, cycle: "MONTHLY" | "YEARLY", autoRenew: boolean = true) {
    this.reloadEnv();

    const plan = await this.db.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) throw new BadRequestException("Invalid plan");
    const amount = Number(cycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice);

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new BadRequestException("Razorpay keys missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in api/.env to open the Razorpay payment gateway.");
    }

    let order: { id: string } | null = null;
    try {
      order = await createOrder(
        Math.round(amount * 100), 
        `t_${tenantId.slice(-8)}_${Date.now()}`, 
        { tenantId, planId, cycle, autoRenew: String(autoRenew !== false) }, 
        keyId, 
        keySecret
      );
    } catch (err: any) {
      throw new BadRequestException("Razorpay Order Error: " + (err.message || "Failed to create order on Razorpay"));
    }

    if (!order) {
      throw new BadRequestException("Could not create Razorpay order. Please verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
    }

    await this.db.payment.create({ 
      data: { 
        tenantId, 
        planId, 
        cycle, 
        amount, 
        razorpayOrderId: order.id,
        autoRenew: autoRenew !== false,
      } 
    });
    return { 
      orderId: order.id, 
      amount: Math.round(amount * 100), 
      currency: "INR", 
      keyId: keyId, 
      planName: plan.name,
      autoRenew: autoRenew !== false
    };
  }

  async toggleAutoRenew(tenantId: string, enabled: boolean) {
    const sub = await this.db.subscription.update({
      where: { tenantId },
      data: { autoRenew: enabled },
      include: { plan: true },
    });
    await this.db.auditLog.create({
      data: {
        tenantId,
        action: enabled ? "AUTO_RENEW_ENABLED" : "AUTO_RENEW_DISABLED",
        entity: sub.id,
      },
    });
    return sub;
  }

  async verify(tenantId: string, orderId: string, paymentId: string, signature: string) {
    this.reloadEnv();

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new BadRequestException("RAZORPAY_KEY_SECRET missing in api/.env");
    }

    if (!hmacOk(`${orderId}|${paymentId}`, signature, keySecret)) {
      throw new UnauthorizedException("Invalid payment signature from Razorpay");
    }

    const p = await this.db.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!p || p.tenantId !== tenantId) throw new BadRequestException("Unknown order or tenant mismatch");
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
        update: { planId: p.planId, cycle: p.cycle, status: "ACTIVE", currentPeriodEnd: end, trialEndsAt: null, autoRenew: p.autoRenew },
        create: { tenantId: p.tenantId, planId: p.planId, cycle: p.cycle, status: "ACTIVE", currentPeriodEnd: end, trialEndsAt: null, autoRenew: p.autoRenew } });
      await tx.auditLog.create({ data: { tenantId: p.tenantId, action: "PAYMENT_SUCCESS", entity: p.id } });
    });
  }

  async webhook(raw: Buffer, signature: string, eventId: string) {
    this.reloadEnv();

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
