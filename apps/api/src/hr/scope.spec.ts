import { ForbiddenException } from "@nestjs/common";
import { csvCell, scope } from "./scope";
const u: any = { sub: "1", tenantId: "t1", isSuperAdmin: false, roles: [], perms: [] };
describe("scope", () => {
  it("always includes tenant", () => expect(scope(u)).toEqual({ tenantId: "t1" }));
  it("adds branch/department restriction", () => expect(scope({ ...u, branchId: "b", departmentId: "d" })).toEqual({ tenantId: "t1", branchId: "b", departmentId: "d" }));
  it("rejects no tenant (plain super admin)", () => expect(() => scope({ ...u, tenantId: null })).toThrow(ForbiddenException));
  it("escapes csv + formulas", () => { expect(csvCell("=1+1")).toBe("'=1+1"); expect(csvCell('a,"b"')).toBe('"a,""b"""'); });
});
