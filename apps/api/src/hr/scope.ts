import { ForbiddenException } from "@nestjs/common";
import { AuthUser } from "../common/auth.types";
/** Every tenant-owned query MUST start from this: tenant from JWT + branch/department restrictions. */
export function scope(u: AuthUser) {
  if (!u.tenantId) throw new ForbiddenException("Company context required");
  return { tenantId: u.tenantId, ...(u.branchId ? { branchId: u.branchId } : {}), ...(u.departmentId ? { departmentId: u.departmentId } : {}) };
}
export const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;           // block spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
