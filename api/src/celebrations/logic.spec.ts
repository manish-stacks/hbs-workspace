import { esc, nextOccurrence, render } from "./logic";
const d = (s: string) => new Date(s + "T00:00:00Z");
describe("celebration logic", () => {
  it("today counts as occurrence", () => expect(nextOccurrence(d("1990-03-10"), d("2026-03-10")).toISOString().slice(0, 10)).toBe("2026-03-10"));
  it("rolls to next year once passed", () => expect(nextOccurrence(d("1990-03-09"), d("2026-03-10")).toISOString().slice(0, 10)).toBe("2027-03-09"));
  it("Feb 29 -> Feb 28 in non-leap years, Feb 29 in leap years", () => { expect(nextOccurrence(d("2000-02-29"), d("2027-01-01")).toISOString().slice(0, 10)).toBe("2027-02-28"); expect(nextOccurrence(d("2000-02-29"), d("2028-01-01")).toISOString().slice(0, 10)).toBe("2028-02-29"); });
  it("renders placeholders", () => expect(render("Hi {{name}} {{x}}", { name: "Asha" })).toBe("Hi Asha "));
  it("escapes html", () => expect(esc("<b>&")).toBe("&lt;b&gt;&amp;"));
});
