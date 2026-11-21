export const DEFAULT_LEAVE_TYPES = [
  { name: "Casual Leave", code: "CL", isPaid: true, annualQuota: 12 }, { name: "Sick Leave", code: "SL", isPaid: true, annualQuota: 12 },
  { name: "Earned Leave", code: "EL", isPaid: true, annualQuota: 15, carryForwardMax: 30, encashable: true }, { name: "Paid Leave", code: "PL", isPaid: true, annualQuota: 6 },
  { name: "Leave Without Pay", code: "LWP", isPaid: false, annualQuota: 0 },
  { name: "Maternity Leave", code: "ML", isPaid: true, annualQuota: 182, genderRestriction: "FEMALE" }, { name: "Paternity Leave", code: "PTL", isPaid: true, annualQuota: 15, genderRestriction: "MALE" },
];
type B = { allocated: any; carriedForward: any; used: any; pending: any; encashed: any };
export const remaining = (b: B) => Number(b.allocated) + Number(b.carriedForward) - Number(b.used) - Number(b.pending) - Number(b.encashed);
/** Most specific matching policy wins (department > branch); falls back to the leave type default. */
export function resolveQuota(type: { annualQuota: any }, policies: { branchId: string | null; departmentId: string | null; annualQuota: any }[], emp: { branchId: string | null; departmentId: string | null }) {
  let best: any = null, bs = -1;
  for (const p of policies) {
    if ((p.branchId && p.branchId !== emp.branchId) || (p.departmentId && p.departmentId !== emp.departmentId)) continue;
    const sc = (p.branchId ? 1 : 0) + (p.departmentId ? 2 : 0); if (sc > bs) { best = p; bs = sc; }
  }
  return Number(best ? best.annualQuota : type.annualQuota);
}
export const carryAmount = (b: B, max: any) => Math.max(0, Math.min(remaining(b), Number(max)));
