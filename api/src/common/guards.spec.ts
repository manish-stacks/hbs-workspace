import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AccessGuard } from "./guards";
const ctx = (user: any) => ({ getHandler: () => 0, getClass: () => 1, switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as any;
const guard = (meta: Record<string, any>) => new AccessGuard({ getAllAndOverride: (k: string) => meta[k] } as unknown as Reflector);
describe("AccessGuard", () => {
  it("blocks company admin from super-admin routes", () => expect(() => guard({ superAdmin: true }).canActivate(ctx({ isSuperAdmin: false, perms: [] }))).toThrow(ForbiddenException));
  it("blocks impersonated session from super-admin routes", () => expect(() => guard({ superAdmin: true }).canActivate(ctx({ isSuperAdmin: true, impersonatedBy: "x", perms: [] }))).toThrow(ForbiddenException));
  it("requires permission", () => expect(() => guard({ perms: ["branch:view"] }).canActivate(ctx({ isSuperAdmin: false, perms: [] }))).toThrow(ForbiddenException));
  it("allows with permission", () => expect(guard({ perms: ["branch:view"] }).canActivate(ctx({ perms: ["branch:view"] }))).toBe(true));
  it("allows real super admin", () => expect(guard({ superAdmin: true }).canActivate(ctx({ isSuperAdmin: true, perms: [] }))).toBe(true));
});
