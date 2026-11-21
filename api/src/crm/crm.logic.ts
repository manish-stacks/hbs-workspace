export const STAGES = ["NEW_LEAD", "CONTACTED", "INTERESTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
export const PROB: Record<string, number> = { NEW_LEAD: 10, CONTACTED: 20, INTERESTED: 40, PROPOSAL: 60, NEGOTIATION: 80, WON: 100, LOST: 0 };
export const weighted = (deals: { stage: string; value: number }[]) => Math.round(deals.filter(d => d.stage !== "WON" && d.stage !== "LOST").reduce((a, d) => a + (d.value * PROB[d.stage]) / 100, 0) * 100) / 100;
export const rate = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
