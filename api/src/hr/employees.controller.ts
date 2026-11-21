import { Body, Controller, Get, Header, Param, Patch, Post, Query } from "@nestjs/common";
import { OmitType, PartialType } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { AuthUser, CurrentUser, RequirePerms } from "../common/auth.types";
import { EmployeesService } from "./employees.service";

export class EmployeeDto {
  @IsString() @MinLength(2) fullName: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsDateString() dob?: string;
  @IsOptional() @IsIn(["MALE", "FEMALE", "OTHER"]) gender?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsDateString() joiningDate: string;
  @IsOptional() @IsIn(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]) employmentType?: string;
  @IsOptional() @IsString() designationId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() shiftId?: string;
  @IsOptional() @IsString() managerId?: string;
  @IsOptional() @IsString() employeeCode?: string;
  @IsOptional() @IsBoolean() createLogin?: boolean;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() ifsc?: string;
}
class UpdateDto extends PartialType(OmitType(EmployeeDto, ["branchId", "createLogin", "employeeCode"] as const)) {}
class TransferDto { @IsOptional() @IsString() branchId?: string; @IsOptional() @IsString() departmentId?: string }
class ImportDto { @IsArray() @ArrayMaxSize(500) rows: any[] }

class ResetPasswordDto {
  @IsString() @MinLength(6) password: string;
}

@Controller("employees")
export class EmployeesController {
  constructor(private s: EmployeesService) {}
  @RequirePerms("employee:view") @Get() list(@CurrentUser() u: AuthUser, @Query() q: any) { return this.s.list(u, q); }
  @RequirePerms("employee:export") @Get("export") @Header("Content-Type", "text/csv") export(@CurrentUser() u: AuthUser) { return this.s.exportCsv(u); }
  @RequirePerms("employee:view") @Get(":id") get(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.get(u, id); }
  @RequirePerms("employee:create") @Post() create(@CurrentUser() u: AuthUser, @Body() d: EmployeeDto) { return this.s.create(u, d); }
  @RequirePerms("employee:create") @Post("import") import(@CurrentUser() u: AuthUser, @Body() d: ImportDto) { return this.s.importRows(u, d.rows); }
  @RequirePerms("employee:edit") @Patch(":id") update(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: UpdateDto) { return this.s.update(u, id, d); }
  @RequirePerms("employee:edit") @Patch(":id/password") resetPassword(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: ResetPasswordDto) { return this.s.resetPassword(u, id, d.password); }
  @RequirePerms("employee:delete") @Post(":id/archive") archive(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.archive(u, id); }
  @RequirePerms("employee:manage") @Post(":id/transfer") transfer(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: TransferDto) { return this.s.transfer(u, id, d); }
}
