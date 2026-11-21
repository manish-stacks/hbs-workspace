import { createHmac, timingSafeEqual } from "crypto";
export function hmacOk(payload: string | Buffer, signature: string, secret: string) {
  if (!signature || !secret) return false;
  const exp = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(exp), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>, customKeyId?: string, customSecret?: string) {
  const id = customKeyId || process.env.RAZORPAY_KEY_ID;
  const sec = customSecret || process.env.RAZORPAY_KEY_SECRET;
  if (!id || !sec) return null;
  const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${id}:${sec}`).toString("base64") },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }) });
  if (!r.ok) throw new Error("Razorpay order failed: " + (await r.text()));
  return (await r.json()) as { id: string };
}
