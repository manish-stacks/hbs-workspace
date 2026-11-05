import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { IsEmail, IsString, MinLength } from "class-validator";
import { AuthService } from "./auth.service";
import { AuthUser, CurrentUser, Public, SuperAdminOnly } from "../common/auth.types";

class RegisterDto { @IsString() @MinLength(2) companyName: string; @IsString() @MinLength(2) name: string; @IsEmail() email: string; @IsString() @MinLength(8) password: string }
class LoginDto { @IsEmail() email: string; @IsString() password: string }
class TokenDto { @IsString() refreshToken: string }

@ApiTags("auth") @Controller()
export class AuthController {
  constructor(private s: AuthService) {}
  @Public() @Throttle({ default: { limit: 10, ttl: 60000 } }) @Post("auth/register-company") register(@Body() d: RegisterDto) { return this.s.registerCompany(d); }
  @Public() @Throttle({ default: { limit: 10, ttl: 60000 } }) @Post("auth/login") login(@Body() d: LoginDto, @Req() r: any) { return this.s.login(d.email, d.password, r.ip); }
  @Public() @Throttle({ default: { limit: 10, ttl: 60000 } }) @Post("auth/refresh") refresh(@Body() d: TokenDto) { return this.s.refresh(d.refreshToken); }
  @Public() @Post("auth/logout") logout(@Body() d: TokenDto) { return this.s.logout(d.refreshToken); }
  @Get("auth/me") me(@CurrentUser() u: AuthUser) { return this.s.me(u); }
  @SuperAdminOnly() @Post("super-admin/companies/:id/access")
  access(@CurrentUser() u: AuthUser, @Param("id") id: string, @Req() r: any) { return this.s.impersonate(u, id, r.ip); }
}
