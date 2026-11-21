"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  ScanFace, 
  Clock, 
  CalendarOff, 
  Receipt, 
  Layers, 
  LogOut, 
  User,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Bell } from "@/components/bell";
import { MeProvider, useMe } from "@/components/me";

const NAV_ITEMS = [
  { href: "/employee", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employee/attendance", label: "Attendance", icon: ScanFace },
  { href: "/employee/shifts", label: "Shifts", icon: Clock },
  { href: "/employee/leaves", label: "Leaves", icon: CalendarOff },
  { href: "/employee/payslips", label: "Payslips", icon: Receipt },
  { href: "/employee/more", label: "Operations & Claims", icon: Layers },
];

function Shell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const path = usePathname();

  const handleLogout = () => {
    sessionStorage.clear();
    location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-neutral-50/70 text-brand-black flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-brand-border bg-white/95 px-4 py-2.5 backdrop-blur-md md:px-8 shadow-2xs">
        <div className="flex items-center gap-6">
          <Link href="/employee" className="flex items-center gap-2">
            <Logo h={34} />
            <span className="hidden sm:inline-block rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase text-neutral-600">
              Staff Portal
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.href === "/employee" ? path === "/employee" : path.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-brand-black text-white shadow-xs"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-brand-black"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? "text-brand-red" : "text-neutral-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right User Bar */}
        <div className="flex items-center gap-3">
          <Bell allHref="/employee/notifications" />

          <div className="flex items-center gap-2.5 pl-2 border-l border-brand-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-black text-white">
              {me.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-brand-black leading-tight">{me.name}</p>
              <p className="text-[10px] text-neutral-400 capitalize">{me.roles[0] || "Staff"}</p>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-red transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center gap-1 border-b border-brand-border bg-white px-3 py-2 overflow-x-auto scrollbar-none">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/employee" ? path === "/employee" : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shrink-0 transition ${
                active ? "bg-brand-black text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Page Content Container */}
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 md:p-8 flex-1 space-y-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border bg-white px-6 py-4 text-center text-xs text-neutral-400">
        HBS Workspace · Employee Self-Service · Protected Biometric Session
      </footer>
    </div>
  );
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <MeProvider>
      <Shell>{children}</Shell>
    </MeProvider>
  );
}
