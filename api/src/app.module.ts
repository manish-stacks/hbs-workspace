import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.service";
import { BillingModule } from "./billing/billing.module";
import { AdminController } from "./hr/admin.controller";
import { EmployeesController } from "./hr/employees.controller";
import { EmployeesService } from "./hr/employees.service";
import { AttendanceController, FaceController } from "./attendance/attendance.controller";
import { AttendanceService } from "./attendance/attendance.service";
import { FaceService } from "./attendance/face.service";
import { HolidaysController, ShiftsController } from "./shifts/shifts.controller";
import { ShiftService } from "./shifts/shifts.service";
import { LeavesController } from "./leaves/leaves.controller";
import { LeaveService } from "./leaves/leaves.service";
import { PayrollController } from "./payroll/payroll.controller";
import { PayrollService } from "./payroll/payroll.service";
import { CelebrationsController, NotificationsController } from "./celebrations/celebrations.controller";
import { CelebrationService } from "./celebrations/celebrations.service";
import { MailService, NotificationService, QueueService } from "./celebrations/infra";
import { WorkersService } from "./celebrations/workers";
import { CrmController } from "./crm/crm.controller";
import { CrmService } from "./crm/crm.service";
import { OpsController, ReportsController } from "./ops/ops.controller";
import { OpsService } from "./ops/ops.service";
import { ReportsService } from "./ops/reports.service";
import { HealthController } from "./health.controller";
import { AuthModule } from "./auth/auth.module";
import { OrgController } from "./companies/org.controller";
import { AccessGuard, JwtAuthGuard } from "./common/guards";
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]), PrismaModule, AuthModule, BillingModule],
  controllers: [OrgController, AdminController, EmployeesController, AttendanceController, FaceController, ShiftsController, HolidaysController, LeavesController, PayrollController, CelebrationsController, NotificationsController, CrmController, OpsController, ReportsController, HealthController],
  providers: [EmployeesService, AttendanceService, FaceService, ShiftService, LeaveService, PayrollService, QueueService, MailService, NotificationService, CelebrationService, CrmService, OpsService, ReportsService, WorkersService, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: AccessGuard }],
})
export class AppModule {}
