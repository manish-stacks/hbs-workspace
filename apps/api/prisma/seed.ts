import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { ALL_PERMISSIONS } from "../src/common/permissions";
const p = new PrismaClient();
async function main() {
  for (const code of ALL_PERMISSIONS) await p.permission.upsert({ where: { code }, update: {}, create: { code } });
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@hbsworkspace.com";
  await p.user.upsert({ where: { email }, update: {}, create: { email, name: "Super Admin", isSuperAdmin: true,
    passwordHash: await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || "ChangeMe@123", 12) } });
  const plans = [["STARTER","Starter",499,4990,25,1],["BUSINESS","Business",1499,14990,100,5],["ENTERPRISE","Enterprise",4999,49990,1000,50]] as const;
  for (const [code,name,m,y,e,b] of plans) await p.subscriptionPlan.upsert({ where:{code}, update:{}, create:{ code,name,monthlyPrice:m,yearlyPrice:y,maxEmployees:e,maxBranches:b } });
  console.log("Seeded permissions + super admin:", email);
}
main().finally(() => p.$disconnect());
