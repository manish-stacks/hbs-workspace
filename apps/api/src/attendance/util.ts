import { ServiceUnavailableException } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
/** YYYY-MM-DD in the company timezone, as a UTC-midnight Date (matches @db.Date). */
export const localDate = (d: Date, tz: string) => new Date(new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d) + "T00:00:00Z");
export const toDay = (s: string) => new Date(s.slice(0, 10) + "T00:00:00Z");
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = (x: number) => (x * Math.PI) / 180, a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const key = () => { const k = process.env.FACE_ENC_KEY; if (!k || !/^[0-9a-f]{64}$/i.test(k)) throw new ServiceUnavailableException("FACE_ENC_KEY (64 hex chars) is not configured"); return Buffer.from(k, "hex"); };
export function encryptVec(v: number[]) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key(), iv), enc = Buffer.concat([c.update(JSON.stringify(v)), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}
export function decryptVec(s: string): number[] {
  const b = Buffer.from(s, "base64"), d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString());
}
export const validVec = (v: any): v is number[] => Array.isArray(v) && v.length === 128 && v.every(x => typeof x === "number" && isFinite(x));
export const euclid = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));

function tzOffsetMs(t: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(t));
  const g = (k: string) => +parts.find(p => p.type === k)!.value;
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(t / 1000) * 1000;
}
/** Local wall-clock (day + minutes after midnight) in `tz` -> UTC instant. */
export const zonedToUtc = (day: Date, minutes: number, tz: string) => { const guess = day.getTime() + minutes * 60000; return new Date(guess - tzOffsetMs(guess, tz)); };
