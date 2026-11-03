"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { MeProvider, can, useMe } from "@/components/me";
const NAV: [string, string, string][] = [["/app/dashboard", "Dashboard", ""], ["/app/employees", "Employees", "employee:view"], ["/app/attendance", "Attendance", "attendance:view"], ["/app/shifts", "Shifts", "shift:view"], ["/app/holidays", "Holidays", "shift:view"], ["/app/leaves", "Leaves", "leave:view"], ["/app/branches", "Branches", "branch:view"],
  ["/app/departments", "Departments", "department:view"], ["/app/settings", "Settings", "company:view"], ["/app/billing", "Billing", "setting:manage"]];
function Shell({ children }: { children: React.ReactNode }) {
  const me = useMe(), path = usePathname();
  const back = () => { sessionStorage.setItem("at", sessionStorage.getItem("sat")!); sessionStorage.removeItem("sat"); location.href = "/super-admin/dashboard"; };
  return (<div className="min-h-screen bg-brand-bg">
    {me.impersonatedBy && <div className="flex items-center justify-between bg-brand-red px-6 py-2 text-sm font-semibold text-white">Super Admin Access Mode — this session is audited<button onClick={back} className="rounded bg-white px-3 py-1 text-brand-red">Return to Super Admin</button></div>}
    <div className="flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-brand-border bg-white p-4 md:block"><Logo h={44} />
        <nav className="mt-6 space-y-1">{NAV.filter(n => !n[2] || can(me, n[2])).map(([h, l]) => <Link key={h} href={h} className={`block rounded-lg px-3 py-2 text-sm font-semibold ${path === h ? "bg-brand-black text-white" : "hover:bg-brand-bg"}`}>{l}</Link>)}</nav></aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mb-4 flex gap-2 overflow-auto md:hidden">{NAV.filter(n => !n[2] || can(me, n[2])).map(([h, l]) => <Link key={h} href={h} className="whitespace-nowrap rounded-full border border-brand-border bg-white px-3 py-1 text-xs font-semibold">{l}</Link>)}</div>
        <div className="mb-4 text-right text-sm text-brand-muted">{me.name} · {me.roles.join(", ")}</div>{children}</main></div></div>);
}
export default function L({ children }: { children: React.ReactNode }) { return <MeProvider><Shell>{children}</Shell></MeProvider>; }
