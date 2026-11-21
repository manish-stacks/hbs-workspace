import { Body, Controller, Get, Post, Put, Query } from "@nestjs/common";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { AuthUser, CurrentUser, RequirePerms } from "../common/auth.types";
import { CelebrationService } from "./celebrations.service";
import { NotificationService } from "./infra";

class SettingsDto { @IsOptional() @IsBoolean() birthdayEnabled?: boolean; @IsOptional() @IsBoolean() anniversaryEnabled?: boolean; @IsOptional() @IsBoolean() inApp?: boolean; @IsOptional() @IsBoolean() email?: boolean; @IsOptional() @IsBoolean() announceToCompany?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(23) hour?: number; @IsOptional() @IsArray() @ArrayMaxSize(30) @IsInt({ each: true }) milestones?: number[] }
class TemplateDto { @IsIn(["BIRTHDAY", "ANNIVERSARY"]) kind: string; @IsString() @MinLength(3) @MaxLength(200) subject: string; @IsString() @MinLength(5) @MaxLength(2000) body: string }
class ReadDto { @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) ids?: string[] }

@Controller("celebrations")
export class CelebrationsController {
  constructor(private s: CelebrationService) {}
  @Get("upcoming") upcoming(@CurrentUser() u: AuthUser, @Query("days") d?: string) { return this.s.upcoming(u, +(d ?? 30)); }
  @RequirePerms("celebration:view") @Get("settings") settings(@CurrentUser() u: AuthUser) { return this.s.getSettings(u); }
  @RequirePerms("celebration:manage") @Put("settings") put(@CurrentUser() u: AuthUser, @Body() d: SettingsDto) { return this.s.putSettings(u, d); }
  @RequirePerms("celebration:view") @Get("templates") templates(@CurrentUser() u: AuthUser) { return this.s.templates(u); }
  @RequirePerms("celebration:manage") @Put("templates") template(@CurrentUser() u: AuthUser, @Body() d: TemplateDto) { return this.s.putTemplate(u, d); }
  @RequirePerms("celebration:view") @Get("history") history(@CurrentUser() u: AuthUser) { return this.s.history(u); }
  @RequirePerms("celebration:manage") @Post("run") run(@CurrentUser() u: AuthUser) { return this.s.runNow(u); }
}
@Controller("notifications")
export class NotificationsController {
  constructor(private n: NotificationService) {}
  @Get() list(@CurrentUser() u: AuthUser) { return this.n.list(u.sub); }
  @Post("read") read(@CurrentUser() u: AuthUser, @Body() d: ReadDto) { return this.n.read(u.sub, d.ids); }
}
