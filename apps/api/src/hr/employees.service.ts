import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { csvCell, scope } from "./scope";

const dt = (s?: string) => (s ? new Date(s) : undefined);
const include = { designation: true, department: true, branch: true, bank: true };

@Injectable()
export class EmployeesService {
  constructor(private db: PrismaService) {}

  private async refs(tenantId: string, d: Record<string, any>) {
    const m: Record<string, string> = { branchId: "branch", departmentId: "department", designationId: "designation", managerId: "employee" };
    for (const [k, model] of Object.entries(m)) if (d[k] && !(await (this.db as any)[model].count({ where: { id: d[k], tenantId } })))
      throw new BadRequestException(`Invalid ${k}`);
  }

  async list(u: AuthUser, q: any) {
    const page = Math.max(1, +q.page || 1), pageSize = Math.min(100, +q.pageSize || 20);
    const sortKey = ["fullName", "employeeCode", "joiningDate", "createdAt"].includes(q.sort) ? q.sort : "createdAt";
    const where: any = { ...scope(u), status: q.status === "ARCHIVED" ? "ARCHIVED" : q.status === "EXITED" ? "EXITED" : "ACTIVE" };
    if (q.branchId && !u.branchId) where.branchId = q.branchId;
    if (q.departmentId && !u.departmentId) where.departmentId = q.departmentId;
    if (q.q) where.OR = ["fullName", "employeeCode", "email", "mobile"].map(f => ({ [f]: { contains: String(q.q) } }));
    const [items, total] = await Promise.all([
      this.db.employee.findMany({ where, include, orderBy: { [sortKey]: q.dir === "asc" ? "asc" : "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.db.employee.count({ where }) ]);
    return { items, total, page, pageSize };
  }

  async get(u: AuthUser, id: string) {
    const e = await this.db.employee.findFirst({ where: { id, ...scope(u) }, include });
    if (!e) throw new NotFoundException("Employee not found");
    return e;
  }

  async create(u: AuthUser, d: any) {
    const tenantId = scope(u).tenantId;
    const sub = await this.db.subscription.findUnique({ where: { tenantId }, include: { plan: true } });
    if (!sub || ["EXPIRED", "CANCELLED"].includes(sub.status) || (sub.status === "TRIAL" && sub.trialEndsAt! < new Date())) throw new ForbiddenException("Subscription inactive. Please subscribe.");
    if (await this.db.employee.count({ where: { tenantId, status: "ACTIVE" } }) >= sub.plan.maxEmployees) throw new ForbiddenException("Employee limit reached for your plan");
    if (u.branchId) d.branchId = u.branchId;
    if (u.departmentId) d.departmentId = u.departmentId;
    await this.refs(tenantId, d);
    if (d.createLogin && !d.email) throw new BadRequestException("Email required to create a login");
    const { createLogin, bankName, accountNumber, ifsc, dob, joiningDate, employeeCode, ...rest } = d;
    let tempPassword: string | undefined;
    const emp = await this.db.$transaction(async tx => {
      const c = await tx.company.update({ where: { tenantId }, data: { nextEmpNo: { increment: 1 } } });
      let userId: string | undefined;
      if (createLogin) {
        const role = await tx.role.findFirst({ where: { tenantId, name: "Employee" } });
        tempPassword = randomBytes(5).toString("hex");
        const user = await tx.user.create({ data: { tenantId, email: d.email, name: d.fullName, passwordHash: await bcrypt.hash(tempPassword, 12), ...(role ? { roles: { create: { roleId: role.id } } } : {}) } });
        userId = user.id;
      }
      const e = await tx.employee.create({ data: { ...rest, tenantId, userId, dob: dt(dob), joiningDate: new Date(joiningDate),
        employeeCode: employeeCode || `EMP-${String(c.nextEmpNo - 1).padStart(4, "0")}`,
        ...((bankName || accountNumber || ifsc) ? { bank: { create: { bankName, accountNumber, ifsc } } } : {}) }, include });
      await tx.auditLog.create({ data: { tenantId, actorId: u.sub, action: "EMPLOYEE_CREATED", entity: e.id } });
      return e;
    });
    return { employee: emp, tempPassword };
  }

  async update(u: AuthUser, id: string, d: any) {
    const cur = await this.get(u, id);
    await this.refs(cur.tenantId, d);
    const { bankName, accountNumber, ifsc, dob, joiningDate, ...rest } = d;
    const bank = { bankName, accountNumber, ifsc };
    const e = await this.db.employee.update({ where: { id }, include, data: { ...rest, dob: dt(dob), joiningDate: dt(joiningDate),
      ...((bankName || accountNumber || ifsc) ? { bank: { upsert: { create: bank, update: bank } } } : {}) } });
    await this.db.auditLog.create({ data: { tenantId: cur.tenantId, actorId: u.sub, action: "EMPLOYEE_UPDATED", entity: id } });
    return e;
  }

  async archive(u: AuthUser, id: string) {
    const cur = await this.get(u, id);
    await this.db.$transaction([
      this.db.employee.update({ where: { id }, data: { status: "ARCHIVED" } }),
      ...(cur.userId ? [this.db.user.update({ where: { id: cur.userId }, data: { status: "INACTIVE" } })] : []),
      this.db.auditLog.create({ data: { tenantId: cur.tenantId, actorId: u.sub, action: "EMPLOYEE_ARCHIVED", entity: id } }) ]);
    return { ok: true };
  }

  async transfer(u: AuthUser, id: string, d: { branchId?: string; departmentId?: string }) {
    const cur = await this.get(u, id);
    if (u.branchId) throw new ForbiddenException("Branch-restricted users cannot transfer employees");
    await this.refs(cur.tenantId, d);
    return this.db.$transaction(async tx => {
      await tx.employeeTransfer.create({ data: { tenantId: cur.tenantId, employeeId: id, fromBranchId: cur.branchId, toBranchId: d.branchId ?? cur.branchId,
        fromDepartmentId: cur.departmentId, toDepartmentId: d.departmentId ?? cur.departmentId, createdById: u.sub } });
      await tx.auditLog.create({ data: { tenantId: cur.tenantId, actorId: u.sub, action: "EMPLOYEE_TRANSFERRED", entity: id } });
      return tx.employee.update({ where: { id }, include, data: { ...(d.branchId ? { branchId: d.branchId } : {}), ...(d.departmentId ? { departmentId: d.departmentId } : {}) } });
    });
  }

  async exportCsv(u: AuthUser) {
    const rows = await this.db.employee.findMany({ where: { ...scope(u), status: "ACTIVE" }, include, orderBy: { employeeCode: "asc" }, take: 5000 });
    const head = ["Employee ID", "Name", "Email", "Mobile", "DOB", "Gender", "Joining Date", "Type", "Designation", "Department", "Branch"];
    const day = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
    return [head, ...rows.map(e => [e.employeeCode, e.fullName, e.email, e.mobile, day(e.dob), e.gender, day(e.joiningDate), e.employmentType, e.designation?.name, e.department?.name, e.branch?.name])]
      .map(r => r.map(csvCell).join(",")).join("\n");
  }

  async importRows(u: AuthUser, rows: any[]) {
    const t = scope(u).tenantId;
    const byName = async (model: string) => new Map<string, string>((await (this.db as any)[model].findMany({ where: { tenantId: t } })).map((x: any) => [x.name.toLowerCase(), x.id]));
    const [br, de, ds] = await Promise.all([byName("branch"), byName("department"), byName("designation")]);
    let created = 0; const errors: { row: number; message: string }[] = [];
    for (const [i, r] of rows.entries()) {
      try {
        if (!r.fullName?.trim()) throw new Error("fullName required");
        if (!r.joiningDate || isNaN(+new Date(r.joiningDate))) throw new Error("valid joiningDate (YYYY-MM-DD) required");
        const pick = (m: Map<string, string>, v?: string, label = "") => { if (!v) return undefined; const id = m.get(v.toLowerCase()); if (!id) throw new Error(`Unknown ${label}: ${v}`); return id; };
        const type = (r.employmentType || "FULL_TIME").toUpperCase();
        if (!["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"].includes(type)) throw new Error("Invalid employmentType");
        await this.create(u, { fullName: r.fullName.trim(), email: r.email || undefined, mobile: r.mobile || undefined, dob: r.dob || undefined, gender: r.gender || undefined,
          joiningDate: r.joiningDate, employmentType: type, branchId: pick(br, r.branch, "branch"), departmentId: pick(de, r.department, "department"), designationId: pick(ds, r.designation, "designation") });
        created++;
      } catch (e: any) { errors.push({ row: i + 2, message: e.message }); }
    }
    return { created, errors };
  }
}
