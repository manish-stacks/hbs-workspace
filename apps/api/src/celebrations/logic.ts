const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** Next occurrence (>= today) of a yearly date; Feb 29 falls on Feb 28 in non-leap years. */
export function nextOccurrence(d: Date, today: Date) {
  const m = d.getUTCMonth(), day = d.getUTCDate(), mk = (y: number) => new Date(Date.UTC(y, m, m === 1 && day === 29 && !leap(y) ? 28 : day));
  let n = mk(today.getUTCFullYear()); if (n < today) n = mk(today.getUTCFullYear() + 1); return n;
}
export const render = (t: string, v: Record<string, string>) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? "");
export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]);
export const DEFAULT_SETTINGS = { birthdayEnabled: true, anniversaryEnabled: true, inApp: true, email: false, announceToCompany: true, hour: 9, milestones: [] as number[] };
export const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  BIRTHDAY: { subject: "Happy Birthday, {{name}}! 🎂", body: "Dear {{name}},\n\nWishing you a very happy birthday! May the year ahead bring you health, joy and success.\n\nWarm wishes,\n{{company}}" },
  ANNIVERSARY: { subject: "Congratulations on {{years}} year(s) with {{company}}, {{name}}!", body: "Dear {{name}},\n\nCongratulations on completing {{years}} year(s) with us! Thank you for everything you bring to the team.\n\nWarm wishes,\n{{company}}" } };
