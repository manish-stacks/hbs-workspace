import { PROB, rate, weighted } from "./crm.logic";
describe("crm logic", () => {
  it("weighted pipeline ignores closed deals", () => expect(weighted([{ stage: "PROPOSAL", value: 1000 }, { stage: "WON", value: 5000 }, { stage: "LOST", value: 900 }, { stage: "NEGOTIATION", value: 100 }])).toBe(680));
  it("conversion rate", () => { expect(rate(1, 4)).toBe(25); expect(rate(0, 0)).toBe(0); expect(rate(1, 3)).toBe(33.3); });
  it("stage probabilities", () => expect(PROB.WON).toBe(100));
});
