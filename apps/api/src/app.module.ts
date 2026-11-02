import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.service";
import { BillingModule } from "./billing/billing.module";
import { AuthModule } from "./auth/auth.module";
import { OrgController } from "./companies/org.controller";
import { AccessGuard, JwtAuthGuard } from "./common/guards";
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]), PrismaModule, AuthModule, BillingModule],
  controllers: [OrgController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: AccessGuard }],
})
export class AppModule {}
