/** All money here is INTEGER PAISE — never floats — to keep payroll exact. */
export interface PayCfg { pfRate: number; pfWageCeiling: number; pfCeilingApplies: boolean; esiEmployeeRate: number; esiEmployerRate: number; esiGrossLimit: number; ptSlabs: { min: number; amount: number }[]; dayBasis: "CALENDAR" | "FIXED30"; otMultiplier: number; standardDayHours: number }
export const DEFAULT_CFG: PayCfg = { pfRate: 12, pfWageCeiling: 15000, pfCeilingApplies: true, esiEmployeeRate: 0.75, esiEmployerRate: 3.25, esiGrossLimit: 21000, ptSlabs: [{ min: 0, amount: 0 }], dayBasis: "CALENDAR", otMultiplier: 2, standardDayHours: 8 };
export interface PayInput { s: { basic: number; hra: number; da: number; conveyance: number; medical: number; special: number; pf: boolean; esi: boolean; pt: boolean; otEligible: boolean; tds: number };
  daysInMonth: number; lossDays: number; otMinutes: number; bonus: number; incentive: number; otherDeduction: number; loan: number; advance: number; adjustment: number }
export const paise = (rupees: any) => Math.round(Number(rupees) * 100);
export const rupees = (p: number) => (p / 100).toFixed(2);

export function calcPay(i: PayInput, cfg: PayCfg) {
  const { s } = i, warnings: string[] = [], basis = cfg.dayBasis === "FIXED30" ? 30 : i.daysInMonth;
  const ratio = Math.min(1, Math.max(0, (basis - i.lossDays) / basis)), er = (v: number) => Math.round(v * ratio);
  const fixed = s.basic + s.hra + s.da + s.conveyance + s.medical + s.special;
  const eBasic = er(s.basic), eDa = er(s.da), earnedFixed = eBasic + er(s.hra) + eDa + er(s.conveyance) + er(s.medical) + er(s.special), lwp = fixed - earnedFixed;
  const hourly = (s.basic + s.da) / (basis * cfg.standardDayHours), overtime = s.otEligible ? Math.round((i.otMinutes / 60) * hourly * cfg.otMultiplier) : 0;
  const arrears = Math.max(i.adjustment, 0), adjDed = Math.max(-i.adjustment, 0), gross = fixed + overtime + i.bonus + i.incentive + arrears;
  let pfWage = eBasic + eDa; if (cfg.pfCeilingApplies) pfWage = Math.min(pfWage, Math.round(cfg.pfWageCeiling * 100));
  const pf = s.pf ? Math.round((pfWage * cfg.pfRate) / 100) : 0, pfEmployer = pf;
  const esiWages = earnedFixed + overtime, esiOn = s.esi && esiWages <= cfg.esiGrossLimit * 100;
  const esi = esiOn ? Math.round((esiWages * cfg.esiEmployeeRate) / 100) : 0, esiEmployer = esiOn ? Math.round((esiWages * cfg.esiEmployerRate) / 100) : 0;
  const ptBase = (earnedFixed + overtime + i.bonus + i.incentive) / 100; let pt = 0;
  if (s.pt) for (const sl of [...cfg.ptSlabs].sort((a, b) => a.min - b.min)) if (ptBase >= sl.min) pt = Math.round(sl.amount * 100);
  const d = { lwp, pf, esi, pt, tds: s.tds, loan: i.loan, advance: i.advance, other: i.otherDeduction, adjustment: adjDed };
  const totalDeductions = Object.values(d).reduce((a, b) => a + b, 0), net = gross - totalDeductions;
  if (net < 0) warnings.push("Net pay is negative — deductions exceed earnings");
  if (s.esi && !esiOn) warnings.push("ESI not applicable: wages above limit");
  return { earnings: { basic: s.basic, hra: s.hra, da: s.da, conveyance: s.conveyance, medical: s.medical, special: s.special, overtime, bonus: i.bonus, incentive: i.incentive, arrears },
    deductions: d, gross, totalDeductions, net, pfEmployer, esiEmployer, warnings };
}
