import { csv, pdf } from "./export";
const t = { title: "T", columns: ["A", "B"], rows: [["=cmd", 'x,"y"'], [1, null]] as any };
describe("reports export", () => {
  it("csv escapes formulas and quotes", () => expect(csv(t)).toBe("A,B\n'=cmd,\"x,\"\"y\"\"\"\n1,"));
  it("pdf renders", async () => expect((await pdf(t)).subarray(0, 4).toString()).toBe("%PDF"));
});
