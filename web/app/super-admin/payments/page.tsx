"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { api, inr } from "@/lib/api";
export default function Pay() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { api<any[]>("/super-admin/payments").then(setRows); }, []);
  return (<Card><h1 className="mb-3 text-xl font-bold">Payments</h1><table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">Date</th><th>Company</th><th>Plan</th><th>Cycle</th><th>Amount</th><th>Status</th><th>Invoice</th></tr></thead>
    <tbody>{rows?.map(r => <tr key={r.id} className="border-t border-brand-border"><td className="py-2">{new Date(r.createdAt).toLocaleString()}</td><td>{r.tenant.company?.name}</td><td>{r.plan.name}</td><td>{r.cycle}</td><td>{inr(r.amount)}</td><td>{r.status}</td><td>{r.invoiceNo ?? "—"}</td></tr>)}</tbody></table>
    {rows && !rows.length && <p className="py-8 text-center text-brand-muted">No payments yet.</p>}</Card>);
}
