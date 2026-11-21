import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { createTransport } from "nodemailer";
import { join } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { esc } from "./logic";

/** Redis/BullMQ plumbing. If REDIS_URL is unset the queues are disabled (jobs can still be run manually). */
@Injectable()
export class QueueService implements OnModuleDestroy {
  readonly enabled = !!process.env.REDIS_URL; private conn?: IORedis; private queues = new Map<string, Queue>(); private workers: Worker[] = [];
  private c() { return (this.conn ??= new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })); }
  queue(n: string) { if (!this.enabled) return null; if (!this.queues.has(n)) this.queues.set(n, new Queue(n, { connection: this.c() })); return this.queues.get(n)!; }
  worker(n: string, fn: (job: any) => Promise<any>) { if (!this.enabled) return null; const w = new Worker(n, fn, { connection: this.c() }); this.workers.push(w); return w; }
  async onModuleDestroy() { await Promise.all([...this.workers.map(w => w.close()), ...[...this.queues.values()].map(q => q.close())]); this.conn?.disconnect(); }
}

export interface MailJob { to: string; subject: string; text: string; logId?: string }
@Injectable()
export class MailService {
  constructor(private db: PrismaService, private q: QueueService) {}
  get configured() { return !!process.env.SMTP_HOST; }
  async send(j: MailJob) {
    const t = createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === "465", auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden"><div style="padding:16px 24px;border-bottom:3px solid #F21B2B"><img src="cid:logo" height="40" alt="HBS Workspace"></div><div style="padding:24px;color:#202020;line-height:1.6">${esc(j.text).replace(/\n/g, "<br>")}</div><div style="padding:12px 24px;background:#F5F5F5;color:#737373;font-size:12px">Sent via HBS Workspace — A HBS Brand</div></div>`;
    await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: j.to, subject: j.subject, text: j.text, html, attachments: [{ filename: "logo.png", path: join(process.cwd(), "assets", "logo.png"), cid: "logo" }] });
  }
  private mark(id: string | undefined, status: string, detail?: string) { return id ? this.db.celebrationLog.update({ where: { id }, data: { status, detail } }) : null; }
  /** Queue when Redis is available (3 attempts, exponential backoff); otherwise send inline; without SMTP record SKIPPED. */
  async deliver(j: MailJob) {
    if (!this.configured) return this.mark(j.logId, "SKIPPED", "SMTP not configured");
    const q = this.q.queue("email"); if (q) return void (await q.add("send", j, { attempts: 3, backoff: { type: "exponential", delay: 30000 }, removeOnComplete: 1000, removeOnFail: 5000 }));
    try { await this.send(j); await this.mark(j.logId, "SENT"); } catch (e: any) { await this.mark(j.logId, "FAILED", String(e.message).slice(0, 250)); }
  }
  markResult(id: string | undefined, ok: boolean, detail?: string) { return this.mark(id, ok ? "SENT" : "FAILED", detail); }
}

@Injectable()
export class NotificationService {
  constructor(private db: PrismaService) {}
  async notify(tenantId: string, userIds: string[], n: { type: string; title: string; body: string; link?: string }) {
    const ids = [...new Set(userIds.filter(Boolean))]; if (ids.length) await this.db.notification.createMany({ data: ids.map(userId => ({ tenantId, userId, ...n })) });
  }
  async list(userId: string) { const [items, unread] = await Promise.all([this.db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }), this.db.notification.count({ where: { userId, readAt: null } })]); return { items, unread }; }
  async read(userId: string, ids?: string[]) { await this.db.notification.updateMany({ where: { userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } }); return { ok: true }; }
}
