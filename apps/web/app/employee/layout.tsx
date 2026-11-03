"use client";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { MeProvider, useMe } from "@/components/me";
function Shell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  return (<div className="min-h-screen bg-brand-bg"><header className="flex items-center gap-6 border-b border-brand-border bg-white px-4 py-2"><Logo h={38} />
    <Link href="/employee/attendance" className="text-sm font-semibold hover:text-brand-red">Attendance</Link>
    <Link href="/employee/shifts" className="text-sm font-semibold hover:text-brand-red">Shifts</Link>
    <span className="ml-auto hidden text-sm text-brand-muted sm:block">{me.name}</span><button className="text-sm text-brand-muted" onClick={() => { sessionStorage.clear(); location.href = "/login"; }}>Logout</button></header>
    <div className="mx-auto max-w-3xl space-y-4 p-4">{children}</div></div>);
}
export default function L({ children }: { children: React.ReactNode }) { return <MeProvider><Shell>{children}</Shell></MeProvider>; }
