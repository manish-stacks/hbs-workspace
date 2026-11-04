import { CATALOG, ReportsService } from "./reports.service";
const s = new ReportsService(null as any), t = { title: "T", columns: ["A", "B"], rows: [["=cmd", 'x,"y"'], [1, null]] as any };
describe("reports export", () => {
  it("csv escapes formulas and quotes", () => expect(s.csv(t)).toBe("A,B\n'=cmd,\"x,\"\"y\"\"\"\n1,"));
  it("pdf renders", async () => expect((await s.pdf(t)).subarray(0, 4).toString()).toBe("%PDF"));
  it("catalog keys are unique", () => expect(new Set(CATALOG.map(c => c.key)).size).toBe(CATALOG.length));
});
