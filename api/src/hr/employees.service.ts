import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { csvCell, scope } from "./scope";

const dt = (s?: string) => (s ? new Date(s) : undefined);
const include: Prisma.EmployeeInclude = { 
  designation: true, 
  department: true, 
  branch: true, 
  bank: true,
  faceTemplate: { select: { id: true, consentAt: true, updatedAt: true } },
  user: { select: { id: true, email: true, status: true, roles: { select: { role: { select: { name: true } } } } } },
  shiftAssignments: {
    where: {
      OR: [{ toDate: null }, { toDate: { gte: new Date() } }]
    },
    orderBy: { fromDate: "desc" },
    take: 1,
    include: {
      shift: {
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          startMinute: true,
          endMinute: true
        }
      }
    }
  }
};

@Injectable()
export class EmployeesService {
  constructor(private db: PrismaService) {}

  private async refs(tenantId: string, d: Record<string, any>) {
    const m: Record<string, string> = { branchId: "branch", departmentId: "department", designationId: "designation", managerId: "employee", shiftId: "shift" };
    for (const [k, model] of Object.entries(m)) if (d[k] && !(await (this.db as any)[model].count({ where: { id: d[k], tenantId } })))
      throw new BadRequestException(`Invalid ${k}`);
  }

  async list(u: AuthUser, q: any) {
    const page = Math.max(1, +q.page || 1), pageSize = Math.min(100, +q.pageSize || 20);
    const sortKey = ["fullName", "employeeCode", "joiningDate", "createdAt"].includes(q.sort) ? q.sort : "createdAt";
    const where: any = { ...scope(u), status: q.status === "ARCHIVED" ? "ARCHIVED" : q.status === "EXITED" ? "EXITED" : "ACTIVE" };
    if (q.branchId && !u.branchId) where.branchId = q.branchId;
    if (q.departmentId && !u.departmentId) where.departmentId = q.departmentId;
    if (q.shiftId) {
      if (q.shiftId === "none" || q.shiftId === "unassigned") {
        where.shiftAssignments = { none: { OR: [{ toDate: null }, { toDate: { gte: new Date() } }] } };
      } else {
        where.shiftAssignments = { some: { shiftId: q.shiftId, OR: [{ toDate: null }, { toDate: { gte: new Date() } }] } };
      }
    }
    if (q.q) where.OR = ["fullName", "employeeCode", "email", "mobile"].map(f => ({ [f]: { contains: String(q.q) } }));
    const [items, total, faceEnrolledCount, totalActive] = await Promise.all([
      this.db.employee.findMany({ where, include, orderBy: { [sortKey]: q.dir === "asc" ? "asc" : "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.db.employee.count({ where }),
      this.db.faceTemplate.count({ where: { tenantId: scope(u).tenantId } }),
      this.db.employee.count({ where: { ...scope(u), status: "ACTIVE" } })
    ]);
    return { items, total, page, pageSize, faceEnrolledCount, totalActive };
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
    const { createLogin, bankName, accountNumber, ifsc, dob, joiningDate, employeeCode, shiftId, ...rest } = d;
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

      if (shiftId) {
        const shift = await tx.shift.findFirst({ where: { id: shiftId, tenantId, isActive: true } });
        if (shift) {
          await tx.shiftAssignment.create({
            data: {
              tenantId,
              employeeId: e.id,
              shiftId: shift.id,
              fromDate: new Date(joiningDate || Date.now()),
              toDate: null,
              isTemporary: false,
              createdById: u.sub
            }
          });
        }
      }

      await tx.auditLog.create({ data: { tenantId, actorId: u.sub, action: "EMPLOYEE_CREATED", entity: e.id } });
      return e;
    });
    return { employee: emp, tempPassword };
  }

  async update(u: AuthUser, id: string, d: any) {
    const cur = await this.get(u, id);
    await this.refs(cur.tenantId, d);
    const { bankName, accountNumber, ifsc, dob, joiningDate, shiftId, ...rest } = d;
    const bank = { bankName, accountNumber, ifsc };
    const e = await this.db.employee.update({ where: { id }, include, data: { ...rest, dob: dt(dob), joiningDate: dt(joiningDate),
      ...((bankName || accountNumber || ifsc) ? { bank: { upsert: { create: bank, update: bank } } } : {}) } });

    if (shiftId !== undefined) {
      if (shiftId) {
        const shift = await this.db.shift.findFirst({ where: { id: shiftId, tenantId: cur.tenantId, isActive: true } });
        if (shift) {
          await this.db.shiftAssignment.deleteMany({
            where: { tenantId: cur.tenantId, employeeId: id, toDate: null }
          });
          await this.db.shiftAssignment.create({
            data: {
              tenantId: cur.tenantId,
              employeeId: id,
              shiftId: shift.id,
              fromDate: new Date(),
              toDate: null,
              isTemporary: false,
              createdById: u.sub
            }
          });
        }
      } else if (shiftId === "") {
        await this.db.shiftAssignment.deleteMany({
          where: { tenantId: cur.tenantId, employeeId: id, toDate: null }
        });
      }
    }

    await this.db.auditLog.create({ data: { tenantId: cur.tenantId, actorId: u.sub, action: "EMPLOYEE_UPDATED", entity: id } });
    return this.get(u, id);
  }

  async resetPassword(u: AuthUser, id: string, newPassword: string) {
    const cur = await this.get(u, id);
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }

    const hash = await bcrypt.hash(newPassword, 12);

    if (cur.userId) {
      await this.db.user.update({
        where: { id: cur.userId },
        data: { passwordHash: hash, status: "ACTIVE" }
      });
    } else {
      if (!cur.email) {
        throw new BadRequestException("Employee must have an email address to create a login account. Please edit employee and add email first.");
      }
      const role = await this.db.role.findFirst({ where: { tenantId: cur.tenantId, name: "Employee" } });
      const user = await this.db.user.create({
        data: {
          tenantId: cur.tenantId,
          email: cur.email,
          name: cur.fullName,
          passwordHash: hash,
          status: "ACTIVE",
          ...(role ? { roles: { create: { roleId: role.id } } } : {})
        }
      });
      await this.db.employee.update({
        where: { id: cur.id },
        data: { userId: user.id }
      });
    }

    await this.db.auditLog.create({
      data: {
        tenantId: cur.tenantId,
        actorId: u.sub,
        action: "EMPLOYEE_PASSWORD_RESET",
        entity: id
      }
    });

    return { ok: true, message: `Password updated successfully for ${cur.fullName}` };
  }

  async archive(u: AuthUser, id: string) {
    const cur = await this.get(u, id);
    await this.db.$transaction([
      this.db.employee.update({ where: { id }, data: { status: "ARCHIVED" } }),
      ...(cur.userId ? [this.db.user.update({ where: { id: cur.userId }, data: { status: "INACTIVE" } })] : []),
      this.db.faceTemplate.deleteMany({ where: { employeeId: id } }),  // biometric retention: purge on archive
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
