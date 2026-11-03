"use client";
export const Bal = ({ b }: { b: any }) => (<div className="rounded-xl border border-brand-border bg-white p-4 shadow-card"><p className="font-bold">{b.leaveType.name}</p>
  <p className="text-3xl font-extrabold">{b.remaining}<span className="text-sm font-normal text-brand-muted"> left</span></p>
  <p className="mt-1 text-xs text-brand-muted">Allocated {b.allocated}{b.carriedForward ? ` (+${b.carriedForward} carried)` : ""} · Used {b.used} · Pending {b.pending}{b.encashed ? ` · Encashed ${b.encashed}` : ""}</p></div>);
export const badge = (s: string) => ({ PENDING: "bg-amber-100 text-amber-800", APPROVED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-brand-red", CANCELLED: "bg-brand-bg text-brand-muted" } as any)[s];
