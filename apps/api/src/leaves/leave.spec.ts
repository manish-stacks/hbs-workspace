import { carryAmount, remaining, resolveQuota } from "./leave.logic";
const b = { allocated: 12, carriedForward: 2, used: 3, pending: 1, encashed: 0 };
describe("leave logic", () => {
  it("remaining", () => expect(remaining(b)).toBe(10));
  it("department policy beats branch beats default", () => {
    const t = { annualQuota: 12 }, e = { branchId: "b1", departmentId: "d1" };
    expect(resolveQuota(t, [], e)).toBe(12);
    expect(resolveQuota(t, [{ branchId: "b1", departmentId: null, annualQuota: 14 }], e)).toBe(14);
    expect(resolveQuota(t, [{ branchId: "b1", departmentId: null, annualQuota: 14 }, { branchId: null, departmentId: "d1", annualQuota: 16 }], e)).toBe(16);
    expect(resolveQuota(t, [{ branchId: "b2", departmentId: null, annualQuota: 99 }], e)).toBe(12);
  });
  it("carry forward capped", () => { expect(carryAmount(b, 5)).toBe(5); expect(carryAmount(b, 30)).toBe(10); expect(carryAmount(b, 0)).toBe(0); });
});
