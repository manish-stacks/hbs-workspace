"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Skeleton, Stat } from "@/components/ui/card";
import { api, inr } from "@/lib/api";
type Co = { id: string; slug: string; status: string; createdAt: string; company: { name: string } | null; _count: { users: number; branches: number } };
export default function Dash() {
  const [s, setS] = useState<any>(null); const [cos, setCos] = useState<Co[] | null>(null); const [err, setErr] = useState("");
  const load = useCallback(() => { api("/super-admin/stats").then(setS).catch(e => setErr(e.message)); api<Co[]>("/super-admin/companies").then(setCos); }, []);
  useEffect(load, [load]);
  const open = async (id: string) => {
    const r = await api<{ accessToken: string }>(`/super-admin/companies/${id}/access`, { method: "POST" });
    sessionStorage.setItem("sat", sessionStorage.getItem("at")!); sessionStorage.setItem("at", r.accessToken); location.href = "/app/dashboard";
  };
  const setStatus = async (id: string, status: string) => { if (confirm(`Set company to ${status}?`)) { await api(`/super-admin/companies/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); load(); } };
  const cards: [string, any][] = s ? [["Companies", s.companies], ["Active", s.active], ["Suspended", s.suspended], ["Users", s.employees], ["Branches", s.branches], ["MRR", inr(s.mrr)], ["ARR", inr(s.arr)],
    ["Transactions", s.transactions], ["Successful", s.successful], ["Failed", s.failed], ["Renewals (7d)", s.upcomingRenewals], ["Expired / Past due", s.expired], ["New (30d)", s.newRegistrations30d]] : [];
  return (<div className="space-y-6"><h1 className="text-2xl font-bold">Platform Overview</h1>{err && <p className="text-brand-red">{err}</p>}
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{s ? cards.map(([l, v]) => <Stat key={l} label={l} value={v} />) : [1, 2, 3, 4].map(i => <Skeleton key={i} />)}</div>
    <Card><h2 className="mb-3 font-bold">Companies</h2>
      <table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">Company</th><th>Status</th><th>Users</th><th>Branches</th><th>Joined</th><th /></tr></thead>
        <tbody>{cos?.map(c => <tr key={c.id} className="border-t border-brand-border"><td className="py-2 font-semibold">{c.company?.name}</td>
          <td><span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-brand-red"}`}>{c.status}</span></td>
          <td>{c._count.users}</td><td>{c._count.branches}</td><td>{new Date(c.createdAt).toLocaleDateString()}</td>
          <td className="flex justify-end gap-2 py-2"><Button variant="dark" className="!px-3 !py-1.5" onClick={() => open(c.id)}>Open Dashboard</Button>
            {c.status === "ACTIVE" ? <Button variant="outline" className="!px-3 !py-1.5" onClick={() => setStatus(c.id, "SUSPENDED")}>Suspend</Button> : <Button variant="outline" className="!px-3 !py-1.5" onClick={() => setStatus(c.id, "ACTIVE")}>Activate</Button>}</td></tr>)}</tbody></table>
      {cos && !cos.length && <p className="py-8 text-center text-brand-muted">No companies yet.</p>}</Card></div>);
}
