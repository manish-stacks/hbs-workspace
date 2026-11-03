import { Body, Controller, Delete, Get, Headers, Param, Post, Query, Req } from "@nestjs/common";
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, MinLength } from "class-validator";
import { AuthUser, CurrentUser, RequirePerms } from "../common/auth.types";
import { AttendanceService } from "./attendance.service";
import { FaceService } from "./face.service";

const STATUS = ["PRESENT", "ABSENT", "HALF_DAY", "WEEKLY_OFF", "HOLIDAY", "ON_LEAVE"];
class PunchDto {
  @IsIn(["CHECK_IN", "CHECK_OUT"]) type: string; @IsIn(["FACE", "SELFIE", "GPS"]) method: string;
  @IsOptional() @IsNumber() lat?: number; @IsOptional() @IsNumber() lng?: number; @IsOptional() @IsNumber() accuracy?: number;
  @IsOptional() @IsString() selfie?: string; @IsOptional() @IsArray() @ArrayMaxSize(128) @IsNumber({}, { each: true }) descriptor?: number[];
  @IsOptional() @IsString() challengeId?: string; @IsOptional() @IsBoolean() liveness?: boolean;
}
class ManualDto { @IsString() employeeId: string; @IsDateString() workDate: string; @IsIn(STATUS) status: string; @IsOptional() @IsDateString() checkInAt?: string; @IsOptional() @IsDateString() checkOutAt?: string; @IsString() @MinLength(3) note: string }
class BulkDto { @IsDateString() workDate: string; @IsIn(STATUS) status: string; @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) employeeIds: string[]; @IsString() @MinLength(3) note: string }
class CorrDto { @IsDateString() workDate: string; @IsOptional() @IsIn(STATUS) requestedStatus?: string; @IsOptional() @IsDateString() requestedIn?: string; @IsOptional() @IsDateString() requestedOut?: string; @IsString() @MinLength(5) reason: string }
class FinalizeDto { @IsDateString() date: string }
class DecideDto { @IsOptional() @IsString() note?: string }
class EnrollDto { @IsOptional() @IsString() employeeId?: string; @IsArray() @ArrayMaxSize(128) @IsNumber({}, { each: true }) descriptor: number[]; @IsBoolean() consent: boolean; @IsBoolean() liveness: boolean; @IsString() challengeId: string }

@Controller("attendance")
export class AttendanceController {
  constructor(private s: AttendanceService) {}
  // employee self-service (any signed-in company user with a linked employee profile)
  @Get("me/today") today(@CurrentUser() u: AuthUser) { return this.s.today(u); }
  @Get("me") mine(@CurrentUser() u: AuthUser, @Query("month") m?: string) { return this.s.mine(u, m); }
  @Post("punch") punch(@CurrentUser() u: AuthUser, @Body() d: PunchDto, @Req() r: any, @Headers("user-agent") ua?: string) { return this.s.punch(u, d, r.ip, ua); }
  @Post("corrections") request(@CurrentUser() u: AuthUser, @Body() d: CorrDto) { return this.s.createCorrection(u, d); }
  @Get("corrections") corrections(@CurrentUser() u: AuthUser, @Query("status") s?: string) { return this.s.corrections(u, s); }
  // admin / HR
  @RequirePerms("attendance:approve") @Post("corrections/:id/approve") approve(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: DecideDto) { return this.s.decide(u, id, true, d.note); }
  @RequirePerms("attendance:reject") @Post("corrections/:id/reject") reject(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: DecideDto) { return this.s.decide(u, id, false, d.note); }
  @RequirePerms("attendance:view") @Get("daily") daily(@CurrentUser() u: AuthUser, @Query("date") date: string) { return this.s.daily(u, date); }
  @RequirePerms("attendance:edit") @Post("manual") manual(@CurrentUser() u: AuthUser, @Body() d: ManualDto) { return this.s.manual(u, d); }
  @RequirePerms("attendance:manage") @Post("finalize") finalize(@CurrentUser() u: AuthUser, @Body() d: FinalizeDto) { return this.s.finalize(u, d.date); }
  @RequirePerms("attendance:edit") @Post("bulk") bulk(@CurrentUser() u: AuthUser, @Body() d: BulkDto) { return this.s.bulk(u, d); }
}

@Controller("face")
export class FaceController {
  constructor(private s: FaceService) {}
  @Get("challenge") challenge(@CurrentUser() u: AuthUser) { return this.s.challenge(u); }
  @Get("status") status(@CurrentUser() u: AuthUser) { return this.s.status(u); }
  @Post("enroll") enroll(@CurrentUser() u: AuthUser, @Body() d: EnrollDto) { return this.s.enroll(u, d); }
  @Delete(":employeeId") remove(@CurrentUser() u: AuthUser, @Param("employeeId") id: string) { return this.s.remove(u, id); }
}
