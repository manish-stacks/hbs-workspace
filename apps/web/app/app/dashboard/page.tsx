"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
export default function CompanyDash() {
  const [sub, setSub] = useState<any>(null); const [n, setN] = useState<number | null>(null); const [att, setAtt] = useState<any>(null);
  useEffect(() => { api("/billing/subscription").then(setSub).catch(() => {}); api<any>("/employees?pageSize=1").then(r => setN(r.total)).catch(() => {}); api<any>("/attendance/daily?date=" + new Date().toISOString().slice(0, 10)).then(r => setAtt(r.summary)).catch(() => {}); }, []);
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Dashboard</h1>
    <div className="grid gap-4 md:grid-cols-2">
      <Card><p className="text-sm text-brand-muted">Active employees</p><p className="text-3xl font-extrabold">{n ?? "—"}</p></Card>
      {att && <Card><p className="text-sm text-brand-muted">Today</p><p className="text-lg font-bold">{att.present + att.halfDay} present · {att.absent} absent · {att.onLeave} on leave · {att.notMarked} not marked</p></Card>}
      <Card><p className="text-sm text-brand-muted">Subscription</p><p className="text-lg font-bold">{sub ? `${sub.plan.name} · ${sub.status}` : "None"}</p>
        {sub?.status === "TRIAL" && sub.trialEndsAt && <p className="text-sm">Trial ends {new Date(sub.trialEndsAt).toLocaleDateString()}</p>}
        <Link href="/app/billing"><Button className="mt-2">Manage plan</Button></Link></Card></div>
    <Card><p className="text-sm text-brand-muted">Attendance, leave and payroll widgets arrive in later phases.</p></Card></div>);
}
