import { SetMetadata, createParamDecorator, ExecutionContext } from "@nestjs/common";
export interface AuthUser { sub: string; tenantId: string | null; isSuperAdmin: boolean; roles: string[]; perms: string[]; impersonatedBy?: string }
export const CurrentUser = createParamDecorator((_: unknown, c: ExecutionContext) => c.switchToHttp().getRequest().user as AuthUser);
export const Public = () => SetMetadata("public", true);
export const RequirePerms = (...p: string[]) => SetMetadata("perms", p);
export const SuperAdminOnly = () => SetMetadata("superAdmin", true);
