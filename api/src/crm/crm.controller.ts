import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { PartialType } from "@nestjs/swagger";
import { IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from "class-validator";
import { AuthUser, CurrentUser, RequirePerms } from "../common/auth.types";
import { CrmService } from "./crm.service";

const STAGES = ["NEW_LEAD", "CONTACTED", "INTERESTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
class LeadDto { @IsString() @MinLength(2) @MaxLength(120) name: string; @IsOptional() @IsString() company?: string; @IsOptional() @IsEmail() email?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsString() source?: string;
  @IsOptional() @IsIn(["NEW", "CONTACTED", "INTERESTED", "LOST"]) status?: string; @IsOptional() @IsIn(["LOW", "MEDIUM", "HIGH"]) priority?: string; @IsOptional() @IsString() ownerId?: string; @IsOptional() @IsDateString() nextFollowUpAt?: string; @IsOptional() @IsString() @MaxLength(2000) notes?: string }
class LeadPatch extends PartialType(LeadDto) {}
class ConvertDto { @IsOptional() @IsString() dealTitle?: string; @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) value?: number }
class CustomerDto { @IsString() @MinLength(2) name: string; @IsOptional() @IsString() company?: string; @IsOptional() @IsEmail() email?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsString() address?: string; @IsOptional() @IsString() notes?: string; @IsOptional() @IsString() ownerId?: string }
class CustomerPatch extends PartialType(CustomerDto) {}
class DealDto { @IsString() @MinLength(2) title: string; @IsString() customerId: string; @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) value: number; @IsOptional() @IsIn(STAGES) stage?: string; @IsOptional() @IsDateString() expectedClose?: string; @IsOptional() @IsString() ownerId?: string }
class DealPatch { @IsOptional() @IsString() title?: string; @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) value?: number; @IsOptional() @IsIn(STAGES) stage?: string; @IsOptional() @IsDateString() expectedClose?: string; @IsOptional() @IsString() ownerId?: string; @IsOptional() @IsString() lostReason?: string }
class ActDto { @IsIn(["CALL", "MEETING", "TASK", "FOLLOW_UP", "NOTE"]) kind: string; @IsString() @MinLength(2) subject: string; @IsOptional() @IsString() notes?: string; @IsOptional() @IsDateString() dueAt?: string; @IsOptional() @IsString() ownerId?: string; @IsOptional() @IsString() leadId?: string; @IsOptional() @IsString() customerId?: string; @IsOptional() @IsString() dealId?: string }
class TargetDto { @IsString() userId: string; @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month: string; @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) amount: number }

@Controller("crm")
export class CrmController {
  constructor(private s: CrmService) {}
  @RequirePerms("crm:view") @Get("users") users(@CurrentUser() u: AuthUser) { return this.s.users(u); }
  @RequirePerms("crm:view") @Get("leads") leads(@CurrentUser() u: AuthUser, @Query() q: any) { return this.s.leads(u, q); }
  @RequirePerms("crm:create") @Post("leads") addLead(@CurrentUser() u: AuthUser, @Body() d: LeadDto) { return this.s.addLead(u, d); }
  @RequirePerms("crm:edit") @Patch("leads/:id") editLead(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: LeadPatch) { return this.s.editLead(u, id, d); }
  @RequirePerms("crm:delete") @Delete("leads/:id") delLead(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.delLead(u, id); }
  @RequirePerms("crm:edit") @Post("leads/:id/convert") convert(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: ConvertDto) { return this.s.convert(u, id, d); }
  @RequirePerms("crm:view") @Get("leads/:id/history") history(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.leadHistory(u, id); }
  @RequirePerms("crm:view") @Get("customers") customers(@CurrentUser() u: AuthUser, @Query() q: any) { return this.s.customers(u, q); }
  @RequirePerms("crm:view") @Get("customers/:id") customer(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.customer(u, id); }
  @RequirePerms("crm:create") @Post("customers") addCustomer(@CurrentUser() u: AuthUser, @Body() d: CustomerDto) { return this.s.addCustomer(u, d); }
  @RequirePerms("crm:edit") @Patch("customers/:id") editCustomer(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: CustomerPatch) { return this.s.editCustomer(u, id, d); }
  @RequirePerms("crm:view") @Get("deals") deals(@CurrentUser() u: AuthUser) { return this.s.deals(u); }
  @RequirePerms("crm:create") @Post("deals") addDeal(@CurrentUser() u: AuthUser, @Body() d: DealDto) { return this.s.addDeal(u, d); }
  @RequirePerms("crm:edit") @Patch("deals/:id") editDeal(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: DealPatch) { return this.s.editDeal(u, id, d); }
  @RequirePerms("crm:delete") @Delete("deals/:id") delDeal(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.delDeal(u, id); }
  @RequirePerms("crm:view") @Get("activities") acts(@CurrentUser() u: AuthUser, @Query() q: any) { return this.s.activities(u, q); }
  @RequirePerms("crm:create") @Post("activities") addAct(@CurrentUser() u: AuthUser, @Body() d: ActDto) { return this.s.addActivity(u, d); }
  @RequirePerms("crm:edit") @Post("activities/:id/complete") done(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.complete(u, id); }
  @RequirePerms("crm:delete") @Delete("activities/:id") delAct(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.delActivity(u, id); }
  @RequirePerms("crm:view") @Get("targets") targets(@CurrentUser() u: AuthUser, @Query("month") m: string) { return this.s.targets(u, m); }
  @RequirePerms("crm:manage") @Put("targets") setTarget(@CurrentUser() u: AuthUser, @Body() d: TargetDto) { return this.s.setTarget(u, d); }
  @RequirePerms("crm:view") @Get("reports") reports(@CurrentUser() u: AuthUser, @Query() q: any) { return this.s.reports(u, q); }
}
