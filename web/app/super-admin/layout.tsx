"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";
export default function SA({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { api<{ isSuperAdmin: boolean; impersonatedBy: string | null }>("/auth/me").then(m => (m.isSuperAdmin && !m.impersonatedBy) ? setOk(true) : (location.href = "/login")).catch(() => (location.href = "/login")); }, []);
  if (!ok) return null;
  return (<div className="min-h-screen bg-brand-bg"><header className="flex items-center gap-8 border-b border-brand-border bg-white px-6 py-2"><Logo h={40} />
    {[["dashboard", "Dashboard"], ["plans", "Plans"], ["payments", "Payments"]].map(([h, l]) => <Link key={h} href={`/super-admin/${h}`} className="text-sm font-semibold hover:text-brand-red">{l}</Link>)}
    <button className="ml-auto text-sm text-brand-muted" onClick={() => { sessionStorage.clear(); location.href = "/login"; }}>Logout</button></header>
    <div className="mx-auto max-w-7xl p-6">{children}</div></div>);
}
