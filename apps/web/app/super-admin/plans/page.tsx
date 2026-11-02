"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
const F = ["monthlyPrice", "yearlyPrice", "maxEmployees", "maxBranches", "trialDays"] as const;
export default function Plans() {
  const [plans, setPlans] = useState<any[]>([]); const [msg, setMsg] = useState("");
  useEffect(() => { api<any[]>("/super-admin/plans").then(setPlans); }, []);
  const save = async (p: any) => { try { const b: any = { name: p.name, isActive: p.isActive }; F.forEach(k => (b[k] = Number(p[k]))); await api(`/super-admin/plans/${p.id}`, { method: "PATCH", body: JSON.stringify(b) }); setMsg(`${p.name} saved`); } catch (e: any) { setMsg(String(e.message)); } };
  const set = (i: number, k: string, v: any) => setPlans(plans.map((p, j) => j === i ? { ...p, [k]: v } : p));
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Plans & Pricing</h1>{msg && <p className="text-sm text-brand-muted">{msg}</p>}
    {plans.map((p, i) => <Card key={p.id}><div className="flex flex-wrap items-end gap-3"><div><label className="text-xs text-brand-muted">Name</label><input className="block w-32 rounded border border-brand-border px-2 py-1.5" value={p.name} onChange={e => set(i, "name", e.target.value)} /></div>
      {F.map(k => <div key={k}><label className="text-xs text-brand-muted">{k}</label><input type="number" className="block w-28 rounded border border-brand-border px-2 py-1.5" value={p[k]} onChange={e => set(i, k, e.target.value)} /></div>)}
      <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={p.isActive} onChange={e => set(i, "isActive", e.target.checked)} />Active</label><Button onClick={() => save(p)}>Save</Button></div></Card>)}</div>);
}
