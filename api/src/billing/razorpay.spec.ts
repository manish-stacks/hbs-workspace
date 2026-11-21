import { createHmac } from "crypto";
import { hmacOk } from "./razorpay";
const sig = (b: string, s: string) => createHmac("sha256", s).update(b).digest("hex");
describe("razorpay signature", () => {
  it("accepts valid", () => expect(hmacOk("order|pay", sig("order|pay", "k"), "k")).toBe(true));
  it("rejects tampered", () => expect(hmacOk("order|pay2", sig("order|pay", "k"), "k")).toBe(false));
  it("rejects empty/missing secret", () => { expect(hmacOk("x", "", "k")).toBe(false); expect(hmacOk("x", "a", "")).toBe(false); });
});
