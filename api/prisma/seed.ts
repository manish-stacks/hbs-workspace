import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { ALL_PERMISSIONS, ROLE_PRESETS } from "../src/common/permissions";

const p = new PrismaClient();

async function main() {
  console.log("Seeding permissions in batch...");
  await p.permission.createMany({
    data: ALL_PERMISSIONS.map(code => ({ code })),
    skipDuplicates: true,
  });

  const email = process.env.SUPER_ADMIN_EMAIL || "admin@hbsworkspace.com";
  console.log("Seeding super admin...");
  await p.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Super Admin",
      isSuperAdmin: true,
      passwordHash: await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || "ChangeMe@123", 12),
    },
  });

  const plans = [
    ["STARTER", "Starter", 499, 4990, 25, 1],
    ["BUSINESS", "Business", 1499, 14990, 100, 5],
    ["ENTERPRISE", "Enterprise", 4999, 49990, 1000, 50],
  ] as const;

  console.log("Seeding plans...");
  for (const [code, name, m, y, e, b] of plans) {
    await p.subscriptionPlan.upsert({
      where: { code },
      update: {},
      create: { code, name, monthlyPrice: m, yearlyPrice: y, maxEmployees: e, maxBranches: b },
    });
  }

  // keep every company's system roles in sync with the latest permission catalogue / presets (safe to re-run)
  const perms = await p.permission.findMany();
  const tenants = await p.tenant.findMany();
  for (const t of tenants) {
    for (const [name, codes] of Object.entries(ROLE_PRESETS)) {
      const r =
        (await p.role.findFirst({ where: { tenantId: t.id, name } })) ??
        (await p.role.create({ data: { tenantId: t.id, name, isSystem: true } }));
      await p.rolePermission.createMany({
        data: perms.filter(x => codes.includes(x.code)).map(x => ({ roleId: r.id, permissionId: x.id })),
        skipDuplicates: true,
      });
    }
  }

  console.log("✅ Seed completed: super admin ->", email);
}

main()
  .catch(err => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
