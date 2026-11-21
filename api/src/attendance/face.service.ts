import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/auth.types";
import { scope } from "../hr/scope";
import { decryptVec, encryptVec, euclid, validVec } from "./util";

const MATCH = 0.5, DUP = 0.45;   // face-api euclidean distance; lower = stricter
@Injectable()
export class FaceService {
  constructor(private db: PrismaService) {}
  private challenges = new Map<string, { userId: string; action: string; exp: number }>();  // single instance; move to Redis when scaling

  challenge(u: AuthUser) {
    for (const [k, v] of this.challenges) if (v.exp < Date.now()) this.challenges.delete(k);
    const id = randomBytes(16).toString("hex"), action = Math.random() < 0.5 ? "BLINK" : "TURN";
    this.challenges.set(id, { userId: u.sub, action, exp: Date.now() + 120000 });
    return { challengeId: id, action };
  }
  consume(u: AuthUser, id?: string) {
    const c = id ? this.challenges.get(id) : undefined; if (id) this.challenges.delete(id);
    return !!c && c.userId === u.sub && c.exp > Date.now();
  }
  kioskChallenge() {
    for (const [k, v] of this.challenges) if (v.exp < Date.now()) this.challenges.delete(k);
    const id = randomBytes(16).toString("hex");
    const actions = ["BLINK", "TURN_LEFT", "TURN_RIGHT", "SMILE"];
    const action = actions[Math.floor(Math.random() * actions.length)];
    this.challenges.set(id, { userId: "kiosk_public", action, exp: Date.now() + 90000 });
    return { challengeId: id, action, expiresAt: Date.now() + 90000 };
  }
  consumeKiosk(id?: string) {
    const c = id ? this.challenges.get(id) : undefined;
    if (id) this.challenges.delete(id);
    return !!c && c.userId === "kiosk_public" && c.exp > Date.now();
  }
  recentFailures(tenantId: string, employeeId: string) {
    return this.db.attendanceLog.count({ where: { tenantId, employeeId, method: "FACE", success: false, createdAt: { gte: new Date(Date.now() - 600000) } } });
  }
  async verify(tenantId: string, employeeId: string, desc: any) {
    if (!validVec(desc)) return { ok: false, distance: undefined, reason: "Invalid face data" };
    const t = await this.db.faceTemplate.findFirst({ where: { tenantId, employeeId } });
    if (!t) return { ok: false, distance: undefined, reason: "Face not registered. Register your face first." };
    const distance = euclid(decryptVec(t.encTemplate), desc);
    return { ok: distance <= MATCH, distance, reason: distance <= MATCH ? undefined : "Face did not match" };
  }
  async status(u: AuthUser) {
    const tenantId = u.tenantId || scope({ ...u, branchId: null, departmentId: null }).tenantId;
    const [t, policy] = await Promise.all([
      this.db.faceTemplate.findFirst({ where: { employee: { userId: u.sub, tenantId } }, select: { consentAt: true } }),
      this.db.companySetting.findUnique({ where: { tenantId_key: { tenantId, key: "face_policy" } } }),
    ]);
    const allowSelfEnroll = !!(policy?.value as any)?.allowSelfEnroll;
    return { enrolled: !!t, consentAt: t?.consentAt ?? null, allowSelfEnroll };
  }
  async getPolicy(u: AuthUser) {
    const tenantId = scope({ ...u, branchId: null, departmentId: null }).tenantId;
    const r = await this.db.companySetting.findUnique({ where: { tenantId_key: { tenantId, key: "face_policy" } } });
    return { allowSelfEnroll: !!(r?.value as any)?.allowSelfEnroll };
  }
  async putPolicy(u: AuthUser, d: { allowSelfEnroll: boolean }) {
    const tenantId = scope({ ...u, branchId: null, departmentId: null }).tenantId;
    const value = { allowSelfEnroll: !!d.allowSelfEnroll, updatedAt: new Date().toISOString() };
    await this.db.companySetting.upsert({
      where: { tenantId_key: { tenantId, key: "face_policy" } },
      create: { tenantId, key: "face_policy", value },
      update: { value },
    });
    await this.db.auditLog.create({
      data: { tenantId, actorId: u.sub, action: "FACE_POLICY_UPDATED", meta: value },
    });
    return value;
  }
  async enroll(u: AuthUser, d: { employeeId?: string; descriptor: number[]; consent: boolean; liveness: boolean; challengeId?: string }) {
    const tenantId = scope({ ...u, branchId: null, departmentId: null }).tenantId;
    if (!d.consent) throw new BadRequestException("Employee consent is required for biometric registration");
    const isPrivileged = u.perms.includes("attendance:manage") || u.perms.includes("employee:edit") || u.roles.includes("OWNER") || u.isSuperAdmin;
    
    // Check if self-enrollment is allowed when non-privileged employee tries to enroll themselves
    if (!isPrivileged) {
      const policySetting = await this.db.companySetting.findUnique({
        where: { tenantId_key: { tenantId, key: "face_policy" } },
      });
      const allowSelfEnroll = !!(policySetting?.value as any)?.allowSelfEnroll;
      if (!allowSelfEnroll) {
        throw new ForbiddenException("Self face registration is disabled by company policy. Only an Admin or HR can scan and enroll your face.");
      }
      if (!d.liveness || !this.consume(u, d.challengeId)) throw new BadRequestException("Liveness check failed or expired");
    } else if (d.challengeId) {
      this.consume(u, d.challengeId);
    }
    if (!validVec(d.descriptor)) throw new BadRequestException("Invalid face data");
    let emp;
    if (d.employeeId) {
      if (!isPrivileged) throw new ForbiddenException("Missing permission");
      emp = await this.db.employee.findFirst({ where: { id: d.employeeId, ...scope(u), status: "ACTIVE" } });
    } else {
      emp = await this.db.employee.findFirst({ where: { userId: u.sub, tenantId, status: "ACTIVE" } });
    }
    if (!emp) throw new NotFoundException("Employee not found");
    const others = await this.db.faceTemplate.findMany({ where: { tenantId, employeeId: { not: emp.id } } });
    if (others.some(o => euclid(decryptVec(o.encTemplate), d.descriptor) < DUP)) throw new BadRequestException("This face is already registered to another employee");
    const data = { encTemplate: encryptVec(d.descriptor), consentAt: new Date() };
    await this.db.faceTemplate.upsert({ where: { employeeId: emp.id }, create: { tenantId, employeeId: emp.id, ...data }, update: data });
    await this.db.auditLog.create({ data: { tenantId, actorId: u.sub, action: "FACE_ENROLLED", entity: emp.id } });
    return { ok: true, employeeId: emp.id };
  }
  async remove(u: AuthUser, employeeId: string) {
    const emp = await this.db.employee.findFirst({ where: { id: employeeId, ...scope(u) } });
    if (!emp) throw new NotFoundException();
    if (emp.userId !== u.sub && !u.perms.includes("attendance:manage")) throw new ForbiddenException("Missing permission");
    await this.db.faceTemplate.deleteMany({ where: { employeeId } });
    await this.db.auditLog.create({ data: { tenantId: emp.tenantId, actorId: u.sub, action: "FACE_REMOVED", entity: employeeId } });
    return { ok: true };
  }
}
