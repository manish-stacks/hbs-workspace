import { Injectable, ExecutionContext, CanActivate, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { AuthUser } from "./auth.types";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private r: Reflector) { super(); }
  canActivate(c: ExecutionContext) {
    if (this.r.getAllAndOverride<boolean>("public", [c.getHandler(), c.getClass()])) return true;
    return super.canActivate(c);
  }
}
/** Backend enforcement of super-admin routes and permission codes. */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private r: Reflector) {}
  canActivate(c: ExecutionContext) {
    const t = [c.getHandler(), c.getClass()];
    if (this.r.getAllAndOverride<boolean>("public", t)) return true;
    const u = c.switchToHttp().getRequest().user as AuthUser;
    if (this.r.getAllAndOverride<boolean>("superAdmin", t)) {
      if (!u.isSuperAdmin || u.impersonatedBy) throw new ForbiddenException("Super Admin only");
      return true;
    }
    const need = this.r.getAllAndOverride<string[]>("perms", t);
    if (need?.length && !need.every(x => u.perms.includes(x))) throw new ForbiddenException("Missing permission");
    return true;
  }
}
