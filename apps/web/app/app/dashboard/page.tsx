"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
export default function CompanyDash() {
  const [me, setMe] = useState<any>(null); const [sub, setSub] = useState<any>(null);
  useEffect(() => { api("/auth/me").then(setMe).catch(() => (location.href = "/login")); api("/billing/subscription").then(setSub).catch(() => {}); }, []);
  if (!me) return null;
  const back = () => { sessionStorage.setItem("at", sessionStorage.getItem("sat")!); sessionStorage.removeItem("sat"); location.href = "/super-admin/dashboard"; };
  return (<div className="min-h-screen bg-brand-bg">
    {me.impersonatedBy && <div className="flex items-center justify-between bg-brand-red px-6 py-2 text-sm font-semibold text-white">Super Admin Access Mode — this session is audited<button onClick={back} className="rounded bg-white px-3 py-1 text-brand-red">Return to Super Admin</button></div>}
    <header className="flex items-center justify-between border-b border-brand-border bg-white px-6 py-2"><Logo h={40} /><span className="text-sm text-brand-muted">{me.name} · {me.roles.join(", ")}</span></header>
    <div className="mx-auto max-w-5xl space-y-4 p-6"><h1 className="text-2xl font-bold">Dashboard</h1>
      <Card><p className="text-sm text-brand-muted">Subscription</p><p className="text-lg font-bold">{sub ? `${sub.plan.name} · ${sub.status}` : "No subscription"}</p>
        {sub?.trialEndsAt && sub.status === "TRIAL" && <p className="text-sm">Trial ends {new Date(sub.trialEndsAt).toLocaleDateString()}</p>}
        <Link href="/app/billing"><Button className="mt-3">Manage plan</Button></Link></Card>
      <Card><p className="text-sm text-brand-muted">HR modules (employees, attendance, payroll…) arrive in Phase 3+.</p></Card></div></div>);
}
