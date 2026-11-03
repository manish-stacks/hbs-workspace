import { DEFAULT_CFG, calcPay } from "./payroll.logic";
import { slipsToBuffer } from "./payslip.pdf";
const s = { basic: 2000000, hra: 800000, da: 0, conveyance: 0, medical: 0, special: 1200000, pf: true, esi: false, pt: false, otEligible: false, tds: 0 };
const base = { s, daysInMonth: 30, lossDays: 0, otMinutes: 0, bonus: 0, incentive: 0, otherDeduction: 0, loan: 0, advance: 0, adjustment: 0 };
describe("payroll calc (paise)", () => {
  it("full month: PF capped at wage ceiling", () => { const r = calcPay(base, DEFAULT_CFG); expect(r.gross).toBe(4000000); expect(r.deductions.pf).toBe(180000); expect(r.net).toBe(3820000); });
  it("loss of pay prorates exactly", () => { const r = calcPay({ ...base, lossDays: 2 }, DEFAULT_CFG); expect(r.deductions.lwp).toBe(266666); expect(r.net).toBe(3553334); expect(r.gross - r.deductions.lwp - r.deductions.pf).toBe(r.net); });
  it("ESI applies under limit only", () => { const r = calcPay({ ...base, s: { ...s, basic: 1000000, hra: 400000, special: 400000, pf: false, esi: true } }, DEFAULT_CFG); expect(r.deductions.esi).toBe(13500); expect(r.esiEmployer).toBe(58500);
    expect(calcPay({ ...base, s: { ...s, esi: true } }, DEFAULT_CFG).deductions.esi).toBe(0); });
  it("professional tax slabs", () => { const cfg = { ...DEFAULT_CFG, ptSlabs: [{ min: 0, amount: 0 }, { min: 15000, amount: 200 }] }; expect(calcPay({ ...base, s: { ...s, pt: true } }, cfg).deductions.pt).toBe(20000); });
  it("overtime, loan, bonus, adjustments", () => { const r = calcPay({ ...base, s: { ...s, otEligible: true, pf: false }, otMinutes: 120, bonus: 100000, loan: 50000, adjustment: -10000 }, DEFAULT_CFG);
    expect(r.earnings.overtime).toBe(Math.round(2 * (2000000 / 240) * 2)); expect(r.deductions.adjustment).toBe(10000); expect(r.net).toBe(r.gross - r.totalDeductions); });
  it("flags negative net", () => expect(calcPay({ ...base, loan: 9000000 }, DEFAULT_CFG).warnings.length).toBeGreaterThan(0));
  it("renders payslip PDF", async () => { const b = await slipsToBuffer([{ company: "Acme", month: "March 2026", number: "PS-1", employee: { name: "A", code: "E1" }, earnings: [["Basic", 100]], deductions: [["PF", 10]], gross: 100, totalDeductions: 10, net: 90, days: { daysInMonth: 31, lossDays: 0 } }]); expect(b.subarray(0, 4).toString()).toBe("%PDF"); });
});
