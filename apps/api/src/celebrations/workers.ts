import { Injectable, OnModuleInit } from "@nestjs/common";
import { CelebrationService } from "./celebrations.service";
import { MailService, QueueService } from "./infra";

/** Registers BullMQ workers + the hourly celebration scheduler. */
@Injectable()
export class WorkersService implements OnModuleInit {
  constructor(private q: QueueService, private mail: MailService, private cel: CelebrationService) {}
  async onModuleInit() {
    if (!this.q.enabled) { console.warn("[jobs] REDIS_URL not set — background jobs disabled (use 'Run now' in Celebrations)."); return; }
    const w = this.q.worker("email", async job => { await this.mail.send(job.data); await this.mail.markResult(job.data.logId, true); });
    w?.on("failed", (job, err) => { if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) this.mail.markResult(job.data.logId, false, err.message.slice(0, 250)); });
    this.q.worker("celebrations", async () => this.cel.runDaily());
    await this.q.queue("celebrations")!.upsertJobScheduler("celebrations-hourly", { pattern: "0 * * * *" }, { name: "daily" });
    console.log("[jobs] workers started; celebration check runs hourly");
  }
}
