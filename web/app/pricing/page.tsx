"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { api, inr } from "@/lib/api";
type Plan = { id: string; name: string; monthlyPrice: string; yearlyPrice: string; maxEmployees: number; maxBranches: number; trialDays: number };
export default function Pricing() {
  const [plans, setPlans] = useState<Plan[] | null>(null); const [yearly, setYearly] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { api<Plan[]>("/plans").then(setPlans).catch(e => setErr(e.message)); }, []);
  return (<main>
    <nav className="flex items-center justify-between border-b border-brand-border px-8 py-3"><Link href="/"><Logo h={44} /></Link><Link href="/login"><Button variant="outline">Login</Button></Link></nav>
    <section className="mx-auto max-w-5xl px-6 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-brand-black">Simple, transparent pricing</h1>
      <div className="mt-6 inline-flex rounded-lg border border-brand-border p-1">
        {["Monthly", "Yearly"].map((l, i) => <button key={l} onClick={() => setYearly(!!i)} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${yearly === !!i ? "bg-brand-black text-white" : ""}`}>{l}</button>)}</div>
      {err && <p className="mt-6 text-brand-red">{err}</p>}
      <div className="mt-10 grid gap-6 md:grid-cols-3">{!plans ? [1, 2, 3].map(i => <Skeleton key={i} />) : plans.map(p => (
        <Card key={p.id} className="text-left"><h3 className="text-lg font-bold">{p.name}</h3>
          <p className="mt-3 text-3xl font-extrabold">{inr(yearly ? p.yearlyPrice : p.monthlyPrice)}<span className="text-sm font-normal text-brand-muted">/{yearly ? "year" : "month"}</span></p>
          <ul className="mt-4 space-y-1 text-sm text-brand-muted"><li>Up to {p.maxEmployees} employees</li><li>Up to {p.maxBranches} branches</li><li>{p.trialDays}-day free trial</li></ul>
          <Link href="/login?register=1"><Button className="mt-6 w-full">Start Free Trial</Button></Link></Card>))}</div>
    </section></main>);
}
