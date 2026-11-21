import { zonedToUtc } from "../attendance/util";
export interface ShiftLike { type: string; startMinute: number; endMinute: number; breakMinutes: number; graceMinutes: number; earlyOutGraceMinutes: number; minWorkMinutes: number; overtimeEnabled: boolean; overtimeAfterMinutes: number }
/** Shift length in minutes; end <= start means it crosses midnight (e.g. 22:00-06:00 = 480). */
export const duration = (s: ShiftLike) => { const d = (s.endMinute - s.startMinute + 1440) % 1440; return d === 0 ? 1440 : d; };
/** Start/end instants of the shift that BEGINS on `workDate` (local date in tz). */
export function shiftTimes(workDate: Date, s: ShiftLike, tz: string) { const start = zonedToUtc(workDate, s.startMinute, tz); return { start, end: new Date(+start + duration(s) * 60000) }; }
export const lateMinutes = (now: Date, start: Date, grace: number) => Math.max(0, Math.floor((+now - +start) / 60000) - grace);
export function closeCalc(s: ShiftLike | null, workDate: Date, checkIn: Date, now: Date, tz: string) {
  const gross = Math.round((+now - +checkIn) / 60000);
  if (!s) return { workMinutes: gross, status: gross < 240 ? "HALF_DAY" : "PRESENT", isEarlyOut: false, overtimeMinutes: 0 };
  const net = Math.max(0, gross - (s.breakMinutes || 0));
  let isEarlyOut = false, ot = 0;
  if (s.type === "FLEXIBLE") { if (s.overtimeEnabled && s.minWorkMinutes > 0 && net - s.minWorkMinutes > s.overtimeAfterMinutes) ot = net - s.minWorkMinutes; }
  else { const { end } = shiftTimes(workDate, s, tz); isEarlyOut = +now < +end - s.earlyOutGraceMinutes * 60000;
    if (s.overtimeEnabled && +now > +end + s.overtimeAfterMinutes * 60000) ot = Math.floor((+now - +end) / 60000); }
  const status = s.minWorkMinutes > 0 ? (net >= s.minWorkMinutes ? "PRESENT" : "HALF_DAY") : net < 240 ? "HALF_DAY" : "PRESENT";
  return { workMinutes: net, status, isEarlyOut, overtimeMinutes: ot };
}
