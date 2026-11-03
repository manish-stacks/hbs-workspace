import { Body, Controller, Get, Header, Param, Patch, Post, Put, Query, StreamableFile } from "@nestjs/common";
import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, Matches, Max, Min, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AuthUser, CurrentUser, RequirePerms } from "../common/auth.types";
import { PayrollService } from "./payroll.service";

const M = /^\d{4}-(0[1-9]|1[0-2])$/;
const pdf = (f: { buf: Buffer; name: string }) => new StreamableFile(f.buf, { type: "application/pdf", disposition: `inline; filename="${f.name}"` });
class StructDto { @IsString() employeeId: string; @IsDateString() effectiveFrom: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) basic: number; @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) hra?: number; @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) da?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) conveyance?: number; @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) medical?: number; @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) special?: number;
  @IsOptional() @IsBoolean() pfApplicable?: boolean; @IsOptional() @IsBoolean() esiApplicable?: boolean; @IsOptional() @IsBoolean() ptApplicable?: boolean; @IsOptional() @IsBoolean() overtimeEligible?: boolean;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) tdsMonthly?: number; @IsOptional() @IsString() note?: string }
class LoanDto { @IsString() employeeId: string; @IsIn(["LOAN", "ADVANCE"]) kind: string; @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) principal: number; @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) emi: number; @Matches(M) startMonth: string }
class AdjDto { @IsString() employeeId: string; @Matches(M) targetMonth: string; @IsNumber({ maxDecimalPlaces: 2 }) amount: number; @IsString() @MinLength(5) reason: string }
class RunDto { @Matches(M) month: string }
class ItemDto { @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) bonus?: number; @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) incentive?: number; @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) otherDeduction?: number }
class Slab { @IsNumber() @Min(0) min: number; @IsNumber() @Min(0) amount: number }
class SettingsDto { @IsOptional() @IsNumber() @Min(0) @Max(100) pfRate?: number; @IsOptional() @IsNumber() @Min(0) pfWageCeiling?: number; @IsOptional() @IsBoolean() pfCeilingApplies?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(100) esiEmployeeRate?: number; @IsOptional() @IsNumber() @Min(0) @Max(100) esiEmployerRate?: number; @IsOptional() @IsNumber() @Min(0) esiGrossLimit?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => Slab) ptSlabs?: Slab[]; @IsOptional() @IsIn(["CALENDAR", "FIXED30"]) dayBasis?: string; @IsOptional() @IsNumber() @Min(1) @Max(5) otMultiplier?: number; @IsOptional() @IsNumber() @Min(1) @Max(24) standardDayHours?: number }

@Controller("payroll")
export class PayrollController {
  constructor(private s: PayrollService) {}
  @Get("me/payslips") mine(@CurrentUser() u: AuthUser) { return this.s.myPayslips(u); }
  @Get("payslips/:id/pdf") async slip(@CurrentUser() u: AuthUser, @Param("id") id: string) { return pdf(await this.s.payslipPdf(u, id)); }
  @RequirePerms("payroll:view") @Get("settings") settings(@CurrentUser() u: AuthUser) { return this.s.getSettings(u); }
  @RequirePerms("payroll:manage") @Put("settings") put(@CurrentUser() u: AuthUser, @Body() d: SettingsDto) { return this.s.putSettings(u, d); }
  @RequirePerms("payroll:view") @Get("structures") structures(@CurrentUser() u: AuthUser, @Query("employeeId") e?: string) { return this.s.structures(u, e); }
  @RequirePerms("payroll:edit") @Post("structures") addStruct(@CurrentUser() u: AuthUser, @Body() d: StructDto) { return this.s.addStructure(u, d); }
  @RequirePerms("payroll:view") @Get("loans") loans(@CurrentUser() u: AuthUser) { return this.s.loans(u); }
  @RequirePerms("payroll:create") @Post("loans") addLoan(@CurrentUser() u: AuthUser, @Body() d: LoanDto) { return this.s.addLoan(u, d); }
  @RequirePerms("payroll:edit") @Post("loans/:id/close") close(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.closeLoan(u, id); }
  @RequirePerms("payroll:manage") @Post("adjustments") adj(@CurrentUser() u: AuthUser, @Body() d: AdjDto) { return this.s.addAdjustment(u, d); }
  @RequirePerms("payroll:view") @Get("runs") runs(@CurrentUser() u: AuthUser) { return this.s.runs(u); }
  @RequirePerms("payroll:create") @Post("runs") create(@CurrentUser() u: AuthUser, @Body() d: RunDto) { return this.s.createRun(u, d.month); }
  @RequirePerms("payroll:view") @Get("runs/:id") run(@CurrentUser() u: AuthUser, @Param("id") id: string, @Query() q: any) { return this.s.getRun(u, id, q); }
  @RequirePerms("payroll:edit") @Patch("runs/:id/items/:itemId") edit(@CurrentUser() u: AuthUser, @Param("id") id: string, @Param("itemId") i: string, @Body() d: ItemDto) { return this.s.editItem(u, id, i, d); }
  @RequirePerms("payroll:create") @Post("runs/:id/submit") submit(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.submit(u, id); }
  @RequirePerms("payroll:approve") @Post("runs/:id/approve") approve(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.approve(u, id); }
  @RequirePerms("payroll:reject") @Post("runs/:id/reject") reject(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.reject(u, id); }
  @RequirePerms("payroll:manage") @Post("runs/:id/lock") lock(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.lock(u, id); }
  @RequirePerms("payroll:export") @Get("runs/:id/export") @Header("Content-Type", "text/csv") exp(@CurrentUser() u: AuthUser, @Param("id") id: string, @Query("type") t: string) { return this.s.exportCsv(u, id, t === "bank" ? "bank" : "register"); }
  @RequirePerms("payroll:export") @Get("runs/:id/payslips.pdf") async bulk(@CurrentUser() u: AuthUser, @Param("id") id: string) { return pdf(await this.s.runPayslipsPdf(u, id)); }
}
