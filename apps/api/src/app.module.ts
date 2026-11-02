import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.service";
import { BillingModule } from "./billing/billing.module";
import { AdminController } from "./hr/admin.controller";
import { EmployeesController } from "./hr/employees.controller";
import { EmployeesService } from "./hr/employees.service";
import { AuthModule } from "./auth/auth.module";
import { OrgController } from "./companies/org.controller";
import { AccessGuard, JwtAuthGuard } from "./common/guards";
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]), PrismaModule, AuthModule, BillingModule],
  controllers: [OrgController, AdminController, EmployeesController],
  providers: [EmployeesService, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: AccessGuard }],
})
export class AppModule {}
