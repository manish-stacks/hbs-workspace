import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { ALL_PERMISSIONS } from "../src/common/permissions";
const p = new PrismaClient();
async function main() {
  for (const code of ALL_PERMISSIONS) await p.permission.upsert({ where: { code }, update: {}, create: { code } });
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@hbsworkspace.com";
  await p.user.upsert({ where: { email }, update: {}, create: { email, name: "Super Admin", isSuperAdmin: true,
    passwordHash: await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || "ChangeMe@123", 12) } });
  console.log("Seeded permissions + super admin:", email);
}
main().finally(() => p.$disconnect());
