import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "./common/auth.types";
import { PrismaService } from "./prisma/prisma.service";
@Controller("health")
export class HealthController {
  constructor(private db: PrismaService) {}
  @Public() @SkipThrottle() @Get()
  async check() { try { await this.db.$queryRaw`SELECT 1`; return { status: "ok", time: new Date().toISOString() }; } catch { throw new ServiceUnavailableException({ status: "db_down" }); } }
}
