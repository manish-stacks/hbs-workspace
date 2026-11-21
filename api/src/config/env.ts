/** Fail fast on unsafe/missing configuration (called from main.ts). Returns a list of warnings. */
export function validateEnv(env: Record<string, string | undefined> = process.env) {
  const errors: string[] = [], warnings: string[] = [], prod = env.NODE_ENV === "production";
  for (const k of ["DATABASE_URL", "JWT_ACCESS_SECRET", "WEB_URL"]) if (!env[k]) errors.push(`${k} is required`);
  const s = env.JWT_ACCESS_SECRET ?? "";
  if (prod && (s.length < 32 || /change-me|secret|password/i.test(s))) errors.push("JWT_ACCESS_SECRET must be a random string of 32+ characters in production");
  if (prod && !/^https:\/\//.test((env.WEB_URL ?? "").split(",")[0])) errors.push("WEB_URL must be https in production");
  if (prod && (env.SUPER_ADMIN_PASSWORD ?? "ChangeMe@123") === "ChangeMe@123") warnings.push("SUPER_ADMIN_PASSWORD is the default — change it before seeding");
  if (env.FACE_ENC_KEY && !/^[0-9a-f]{64}$/i.test(env.FACE_ENC_KEY)) errors.push("FACE_ENC_KEY must be 64 hex characters");
  if (!env.FACE_ENC_KEY) warnings.push("FACE_ENC_KEY not set — face attendance disabled");
  if (!env.REDIS_URL) warnings.push("REDIS_URL not set — background jobs disabled");
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) warnings.push("Razorpay keys not set — subscription payments disabled");
  if (!env.RAZORPAY_WEBHOOK_SECRET) warnings.push("RAZORPAY_WEBHOOK_SECRET not set — webhooks will be rejected");
  if (!env.SMTP_HOST) warnings.push("SMTP_HOST not set — emails are skipped");
  return { errors, warnings };
}
