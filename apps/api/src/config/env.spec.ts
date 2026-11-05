import { validateEnv } from "./env";
const ok = { DATABASE_URL: "mysql://x", JWT_ACCESS_SECRET: "k".repeat(40), WEB_URL: "https://app.example.com", NODE_ENV: "production", SUPER_ADMIN_PASSWORD: "Str0ng!pass" };
describe("validateEnv", () => {
  it("accepts a safe production config", () => expect(validateEnv(ok).errors).toEqual([]));
  it("rejects weak secrets / http in production", () => { expect(validateEnv({ ...ok, JWT_ACCESS_SECRET: "change-me-access" }).errors.length).toBe(1); expect(validateEnv({ ...ok, WEB_URL: "http://x" }).errors.length).toBe(1); });
  it("requires core vars", () => expect(validateEnv({}).errors.length).toBe(3));
  it("validates face key", () => expect(validateEnv({ ...ok, FACE_ENC_KEY: "abc" }).errors.length).toBe(1));
});
