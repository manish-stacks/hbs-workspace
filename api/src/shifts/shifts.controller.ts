import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { PartialType } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";
import { AuthUser, CurrentUser, RequirePerms } from "../common/auth.types";
import { ShiftService } from "./shifts.service";

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
class ShiftDto {
  @IsString() name: string; @IsString() code: string;
  @IsIn(["GENERAL", "MORNING", "EVENING", "NIGHT", "ROTATIONAL", "FLEXIBLE", "SPLIT", "CUSTOM"]) type: string;
  @Matches(HM) startTime: string; @Matches(HM) endTime: string;
  @IsOptional() @IsInt() @Min(0) @Max(480) breakMinutes?: number; @IsOptional() @IsInt() @Min(0) @Max(240) graceMinutes?: number; @IsOptional() @IsInt() @Min(0) @Max(240) earlyOutGraceMinutes?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1440) minWorkMinutes?: number; @IsOptional() @IsBoolean() overtimeEnabled?: boolean; @IsOptional() @IsInt() @Min(0) @Max(480) overtimeAfterMinutes?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) weeklyOffDays?: number[];
  @IsOptional() @IsString() branchId?: string; @IsOptional() @IsString() departmentId?: string; @IsOptional() @IsDateString() effectiveFrom?: string; @IsOptional() @IsBoolean() isActive?: boolean;
}
class ShiftPatch extends PartialType(ShiftDto) {}
class AssignDto { @IsString() shiftId: string; @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) employeeIds?: string[]; @IsOptional() @IsString() departmentId?: string; @IsOptional() @IsString() branchId?: string;
  @IsDateString() fromDate: string; @IsOptional() @IsDateString() toDate?: string; @IsOptional() @IsBoolean() isTemporary?: boolean }
class RotationDto { @IsArray() @ArrayMaxSize(14) pattern: (string | null)[]; @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) employeeIds: string[]; @IsDateString() startDate: string; @IsInt() @Min(1) @Max(62) days: number; @IsOptional() @IsBoolean() stagger?: boolean }
class SwapDto { @IsString() targetId: string; @IsDateString() date: string }
class RespondDto { @IsBoolean() accept: boolean }
class HolidayDto { @IsString() name: string; @IsDateString() date: string; @IsOptional() @IsIn(["COMPANY", "OPTIONAL"]) type?: string; @IsOptional() @IsString() branchId?: string; @IsOptional() @IsString() departmentId?: string }

@Controller("shifts")
export class ShiftsController {
  constructor(private s: ShiftService) {}
  @RequirePerms("shift:view") @Get() list(@CurrentUser() u: AuthUser) { return this.s.list(u); }
  @RequirePerms("shift:create") @Post() create(@CurrentUser() u: AuthUser, @Body() d: ShiftDto) { return this.s.create(u, d); }
  @RequirePerms("shift:view") @Get("roster") roster(@CurrentUser() u: AuthUser, @Query() q: any) { return this.s.roster(u, q); }
  @RequirePerms("shift:view") @Get("reports") reports(@CurrentUser() u: AuthUser, @Query() q: any) { return this.s.reports(u, q); }
  @Get("mine") mine(@CurrentUser() u: AuthUser, @Query() q: any) { return this.s.mine(u, q); }
  @Get("colleagues") colleagues(@CurrentUser() u: AuthUser) { return this.s.colleagues(u); }
  @RequirePerms("shift:create") @Post("assignments") assign(@CurrentUser() u: AuthUser, @Body() d: AssignDto) { return this.s.assign(u, d); }
  @RequirePerms("shift:view") @Get("assignments") assignments(@CurrentUser() u: AuthUser, @Query("employeeId") e?: string) { return this.s.assignments(u, e); }
  @RequirePerms("shift:delete") @Delete("assignments/:id") rmAssign(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.removeAssignment(u, id); }
  @RequirePerms("shift:create") @Post("rotation") rotation(@CurrentUser() u: AuthUser, @Body() d: RotationDto) { return this.s.rotation(u, d); }
  @Post("swaps") swap(@CurrentUser() u: AuthUser, @Body() d: SwapDto) { return this.s.createSwap(u, d); }
  @Get("swaps") swaps(@CurrentUser() u: AuthUser) { return this.s.swaps(u); }
  @Post("swaps/:id/respond") respond(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: RespondDto) { return this.s.respond(u, id, d.accept); }
  @RequirePerms("shift:approve") @Post("swaps/:id/approve") approve(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.decideSwap(u, id, true); }
  @RequirePerms("shift:reject") @Post("swaps/:id/reject") reject(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.decideSwap(u, id, false); }
  @RequirePerms("shift:edit") @Patch(":id") update(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: ShiftPatch) { return this.s.update(u, id, d); }
}
@Controller("holidays")
export class HolidaysController {
  constructor(private s: ShiftService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query("year") y?: string) { return this.s.holidays(u, y); }
  @RequirePerms("shift:create") @Post() add(@CurrentUser() u: AuthUser, @Body() d: HolidayDto) { return this.s.addHoliday(u, d); }
  @RequirePerms("shift:delete") @Delete(":id") rm(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.removeHoliday(u, id); }
}
