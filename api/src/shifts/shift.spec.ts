import { zonedToUtc } from "../attendance/util";
import { closeCalc, lateMinutes, shiftTimes } from "./shift.logic";
const night: any = { type: "NIGHT", startMinute: 22 * 60, endMinute: 6 * 60, breakMinutes: 30, graceMinutes: 10, earlyOutGraceMinutes: 10, minWorkMinutes: 420, overtimeEnabled: true, overtimeAfterMinutes: 15 };
const day = new Date("2026-03-10T00:00:00Z"), TZ = "Asia/Kolkata";
describe("shift logic", () => {
  it("zonedToUtc IST", () => expect(zonedToUtc(day, 22 * 60, TZ).toISOString()).toBe("2026-03-10T16:30:00.000Z"));
  it("zonedToUtc New York (DST)", () => expect(zonedToUtc(new Date("2026-07-01T00:00:00Z"), 9 * 60, "America/New_York").toISOString()).toBe("2026-07-01T13:00:00.000Z"));
  it("night shift ends next morning on the same work date", () => { const t = shiftTimes(day, night, TZ); expect(t.start.toISOString()).toBe("2026-03-10T16:30:00.000Z"); expect(t.end.toISOString()).toBe("2026-03-11T00:30:00.000Z"); });
  it("grace period", () => { const { start } = shiftTimes(day, night, TZ); expect(lateMinutes(new Date(+start + 9 * 6e4), start, 10)).toBe(0); expect(lateMinutes(new Date(+start + 25 * 6e4), start, 10)).toBe(15); });
  it("overnight checkout: one record, overtime counted", () => { const { start, end } = shiftTimes(day, night, TZ);
    const r = closeCalc(night, day, new Date(+start + 5 * 6e4), new Date(+end + 45 * 6e4), TZ); expect(r).toMatchObject({ status: "PRESENT", isEarlyOut: false, overtimeMinutes: 45, workMinutes: 8 * 60 + 40 - 30 }); });
  it("early checkout", () => { const { start, end } = shiftTimes(day, night, TZ); expect(closeCalc(night, day, start, new Date(+end - 120 * 6e4), TZ)).toMatchObject({ isEarlyOut: true, overtimeMinutes: 0 }); });
  it("below minimum hours -> half day", () => { const { start } = shiftTimes(day, night, TZ); expect(closeCalc(night, day, start, new Date(+start + 4 * 36e5), TZ).status).toBe("HALF_DAY"); });
  it("no shift falls back to 4h rule", () => expect(closeCalc(null, day, day, new Date(+day + 5 * 36e5), TZ).status).toBe("PRESENT"));
});
