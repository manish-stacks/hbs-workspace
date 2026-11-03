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
import { AuthModule } from "./auth/auth.module";
import { OrgController } from "./companies/org.controller";
import { AccessGuard, JwtAuthGuard } from "./common/guards";
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]), PrismaModule, AuthModule, BillingModule],
  controllers: [OrgController, AdminController, EmployeesController, AttendanceController, FaceController, ShiftsController, HolidaysController, LeavesController],
  providers: [EmployeesService, AttendanceService, FaceService, ShiftService, LeaveService, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: AccessGuard }],
})
export class AppModule {}
