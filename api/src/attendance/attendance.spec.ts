import { decryptVec, encryptVec, euclid, haversine, localDate, validVec } from "./util";
describe("attendance utils", () => {
  beforeAll(() => { process.env.FACE_ENC_KEY = "a".repeat(64); });
  it("localDate uses company timezone", () => expect(localDate(new Date("2026-01-01T20:00:00Z"), "Asia/Kolkata").toISOString()).toBe("2026-01-02T00:00:00.000Z"));
  it("haversine ~111km per degree", () => expect(Math.round(haversine(0, 0, 1, 0) / 1000)).toBe(111));
  it("encrypts/decrypts template", () => { const v = Array.from({ length: 128 }, (_, i) => i / 100); const e = encryptVec(v); expect(e).not.toContain("0.01"); expect(decryptVec(e)).toEqual(v); });
  it("detects tampering", () => { const e = Buffer.from(encryptVec([1]), "base64"); e[e.length - 1] ^= 1; expect(() => decryptVec(e.toString("base64"))).toThrow(); });
  it("validates vectors", () => { expect(validVec(new Array(128).fill(0.1))).toBe(true); expect(validVec([1, 2])).toBe(false); expect(validVec(new Array(128).fill(NaN))).toBe(false); });
  it("euclid", () => expect(euclid([0, 0], [3, 4])).toBe(5));
});
