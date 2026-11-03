import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { PartialType } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { AuthUser, CurrentUser, RequirePerms } from "../common/auth.types";
import { LeaveService } from "./leaves.service";

class TypeDto { @IsString() @MinLength(2) name: string; @IsString() @MinLength(1) code: string; @IsBoolean() isPaid: boolean; @IsNumber() @Min(0) @Max(400) annualQuota: number;
  @IsOptional() @IsNumber() @Min(0) carryForwardMax?: number; @IsOptional() @IsBoolean() encashable?: boolean; @IsOptional() @IsBoolean() allowHalfDay?: boolean; @IsOptional() @IsIn([1, 2]) approvalLevels?: number;
  @IsOptional() @IsIn(["MALE", "FEMALE"]) genderRestriction?: string; @IsOptional() @IsBoolean() isActive?: boolean }
class TypePatch extends PartialType(TypeDto) {}
class PolicyDto { @IsString() leaveTypeId: string; @IsOptional() @IsString() branchId?: string; @IsOptional() @IsString() departmentId?: string; @IsNumber() @Min(0) @Max(400) annualQuota: number }
class ApplyDto { @IsString() leaveTypeId: string; @IsDateString() fromDate: string; @IsDateString() toDate: string; @IsOptional() @IsBoolean() isHalfDay?: boolean; @IsOptional() @IsBoolean() isEmergency?: boolean; @IsString() @MinLength(3) reason: string }
class DecideDto { @IsOptional() @IsString() note?: string }
class AllocDto { @IsInt() @Min(2000) @Max(2100) year: number; @IsOptional() @IsArray() @ArrayMaxSize(2000) @IsString({ each: true }) employeeIds?: string[] }
class CarryDto { @IsInt() @Min(2000) @Max(2100) fromYear: number }
class EncashDto { @IsString() employeeId: string; @IsString() leaveTypeId: string; @IsInt() year: number; @IsNumber() @Min(0.5) days: number }

@Controller("leaves")
export class LeavesController {
  constructor(private s: LeaveService) {}
  // employee self-service
  @Get("types") types(@CurrentUser() u: AuthUser, @Query("all") all?: string) { return this.s.types(u, all === "1" && u.perms.includes("leave:view")); }
  @Get("me/balances") myBalances(@CurrentUser() u: AuthUser, @Query("year") y?: string) { return this.s.myBalances(u, y); }
  @Get("me/applications") mine(@CurrentUser() u: AuthUser) { return this.s.mine(u); }
  @Post("apply") apply(@CurrentUser() u: AuthUser, @Body() d: ApplyDto) { return this.s.apply(u, d); }
  @Post(":id/cancel") cancel(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.cancel(u, id); }
  // managers / HR
  @RequirePerms("leave:view") @Get("applications") list(@CurrentUser() u: AuthUser, @Query() q: any) { return this.s.list(u, q); }
  @RequirePerms("leave:approve") @Post(":id/approve") approve(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: DecideDto) { return this.s.decide(u, id, true, d.note); }
  @RequirePerms("leave:reject") @Post(":id/reject") reject(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: DecideDto) { return this.s.decide(u, id, false, d.note); }
  @RequirePerms("leave:view") @Get("balances") balances(@CurrentUser() u: AuthUser, @Query("employeeId") e: string, @Query("year") y?: string) { return this.s.balances(u, e, y); }
  @RequirePerms("leave:view") @Get("lwp") lwp(@CurrentUser() u: AuthUser, @Query("month") m: string) { return this.s.lwp(u, m); }
  @RequirePerms("leave:create") @Post("types") addType(@CurrentUser() u: AuthUser, @Body() d: TypeDto) { return this.s.addType(u, d); }
  @RequirePerms("leave:create") @Post("types/defaults") defaults(@CurrentUser() u: AuthUser) { return this.s.defaults(u); }
  @RequirePerms("leave:edit") @Patch("types/:id") editType(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: TypePatch) { return this.s.editType(u, id, d); }
  @RequirePerms("leave:manage") @Get("policies") policies(@CurrentUser() u: AuthUser) { return this.s.policies(u); }
  @RequirePerms("leave:manage") @Post("policies") addPolicy(@CurrentUser() u: AuthUser, @Body() d: PolicyDto) { return this.s.addPolicy(u, d); }
  @RequirePerms("leave:manage") @Delete("policies/:id") delPolicy(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.delPolicy(u, id); }
  @RequirePerms("leave:manage") @Post("allocate") allocate(@CurrentUser() u: AuthUser, @Body() d: AllocDto) { return this.s.allocate(u, d.year, d.employeeIds); }
  @RequirePerms("leave:manage") @Post("carry-forward") carry(@CurrentUser() u: AuthUser, @Body() d: CarryDto) { return this.s.carryForward(u, d.fromYear); }
  @RequirePerms("leave:manage") @Post("encash") encash(@CurrentUser() u: AuthUser, @Body() d: EncashDto) { return this.s.encash(u, d); }
}
