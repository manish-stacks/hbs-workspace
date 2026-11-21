"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  UserCheck, 
  ScanFace, 
  Clock, 
  Calendar, 
  CalendarOff, 
  Gift, 
  DollarSign, 
  Receipt, 
  CreditCard, 
  TrendingUp, 
  Kanban, 
  Briefcase, 
  Layers, 
  Building2, 
  Network, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X, 
  Sparkles,
  ExternalLink,
  Smartphone,
  Monitor
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Bell } from "@/components/bell";
import { MeProvider, can, useMe } from "@/components/me";

interface NavChild {
  href: string;
  label: string;
  icon: any;
  perm?: string;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  perm?: string;
  items: NavChild[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "workforce",
    label: "Workforce & Rostering",
    icon: Users,
    perm: "employee:view|attendance:view|shift:view|leave:view",
    items: [
      { href: "/app/employees", label: "Employees", icon: UserCheck, perm: "employee:view" },
      { href: "/app/attendance", label: "Face Attendance", icon: ScanFace, perm: "attendance:view", badge: "AI" },
      { href: "/kiosk", label: "Face Kiosk Terminal", icon: Monitor, badge: "No Login" },
      { href: "/app/shifts", label: "Shift Rosters", icon: Clock, perm: "shift:view" },
      { href: "/app/leaves", label: "Leaves & Time Off", icon: CalendarOff, perm: "leave:view" },
      { href: "/app/holidays", label: "Holidays", icon: Calendar, perm: "shift:view" },
      { href: "/app/celebrations", label: "Celebrations", icon: Gift, perm: "celebration:view" },
    ]
  },
  {
    id: "payroll",
    label: "Payroll & Finance",
    icon: DollarSign,
    perm: "payroll:view|setting:manage",
    items: [
      { href: "/app/payroll", label: "Salary Processing", icon: Receipt, perm: "payroll:view" },
      { href: "/app/billing", label: "Plan & Billing", icon: CreditCard, perm: "setting:manage" },
    ]
  },
  {
    id: "crm",
    label: "Sales CRM",
    icon: TrendingUp,
    perm: "crm:view",
    items: [
      { href: "/app/crm", label: "Deals & Pipelines", icon: Kanban, perm: "crm:view", badge: "Deals" },
      { href: "/app/crm?tab=Leads", label: "Leads Directory", icon: Users, perm: "crm:view" },
      { href: "/app/crm?tab=Customers", label: "Customers & Accounts", icon: Building2, perm: "crm:view" },
      { href: "/app/crm?tab=Tasks", label: "Tasks & Activities", icon: Clock, perm: "crm:view" },
      { href: "/app/crm?tab=Reports", label: "Sales Analytics", icon: BarChart3, perm: "crm:view" },
    ]
  },
  {
    id: "operations",
    label: "Operations & Org",
    icon: Briefcase,
    perm: "expense:view|asset:view|recruitment:view|performance:view|helpdesk:view|announcement:create|branch:view|department:view",
    items: [
      { href: "/app/operations", label: "Assets & Expenses", icon: Layers, perm: "expense:view|asset:view|recruitment:view|performance:view|helpdesk:view|announcement:create" },
      { href: "/app/branches", label: "Branch Offices", icon: Building2, perm: "branch:view" },
      { href: "/app/departments", label: "Departments", icon: Network, perm: "department:view" },
    ]
  }
];

function Shell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const path = usePathname();
  const router = useRouter();
  
  // Collapsible dropdown menu state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    workforce: true,
    payroll: false,
    crm: false,
    operations: false,
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-expand group if current path is inside that group
  useEffect(() => {
    NAV_GROUPS.forEach(g => {
      if (g.items.some(item => item.href.split("?")[0] === path)) {
        setOpenGroups(prev => ({ ...prev, [g.id]: true }));
      }
    });
  }, [path]);

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const logout = () => {
    sessionStorage.clear();
    localStorage.clear();
    router.push("/login");
  };

  const returnToSuperAdmin = () => {
    const sat = sessionStorage.getItem("sat");
    if (sat) {
      sessionStorage.setItem("at", sat);
      sessionStorage.removeItem("sat");
    }
    location.href = "/super-admin/dashboard";
  };

  // Check if group is permitted
  const isGroupPermitted = (g: NavGroup) => {
    if (!g.perm) return true;
    return g.perm.split("|").some(p => can(me, p));
  };

  // Check if single item is permitted
  const isItemPermitted = (item: NavChild) => {
    if (!item.perm) return true;
    return item.perm.split("|").some(p => can(me, p));
  };

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-text">
      {/* Super Admin Impersonation Notice Banner */}
      {me.impersonatedBy && (
        <div className="sticky top-0 z-50 flex items-center justify-between bg-gradient-to-r from-red-600 to-rose-700 px-6 py-2.5 text-xs font-bold text-white shadow-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>Super Admin Audited Impersonation Mode</span>
          </div>
          <button
            onClick={returnToSuperAdmin}
            className="rounded-full bg-white px-3.5 py-1 text-xs font-bold text-brand-red hover:bg-neutral-100 shadow-xs"
          >
            Return to Super Admin Portal &rarr;
          </button>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar with Collapsible Dropdown Navigation */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-brand-border bg-white md:flex">
          {/* Top Brand & Workspace Identifier */}
          <div className="p-4 border-b border-brand-border">
            <div className="flex items-center justify-between">
              <Link href="/app/dashboard">
                <Logo h={38} />
              </Link>
              <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-neutral-600">
                PRO
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 border border-brand-border">
              <div className="truncate">
                <p className="text-xs font-bold text-brand-black truncate">Enterprise Hub</p>
                <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live Sync Active
                </p>
              </div>
              <Link 
                href="/employee/attendance"
                title="Open Face Attendance Terminal" 
                className="rounded-lg p-1 text-neutral-400 hover:text-brand-red hover:bg-white"
              >
                <Smartphone className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Navigation Items (Scrollable Menu) */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
            {/* Direct Dashboard Link */}
            <Link
              href="/app/dashboard"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                path === "/app/dashboard"
                  ? "bg-neutral-900 text-white shadow-xs border-l-4 border-brand-red"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-brand-black"
              }`}
            >
              <LayoutDashboard className={`h-4 w-4 ${path === "/app/dashboard" ? "text-brand-red" : ""}`} />
              <span>Dashboard</span>
            </Link>

            {/* Direct Reports Link */}
            {can(me, "report:view") && (
              <Link
                href="/app/reports"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                  path === "/app/reports"
                    ? "bg-neutral-900 text-white shadow-xs border-l-4 border-brand-red"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-brand-black"
                }`}
              >
                <BarChart3 className={`h-4 w-4 ${path === "/app/reports" ? "text-brand-red" : ""}`} />
                <span>Reports & Analytics</span>
              </Link>
            )}

            {/* Grouped Collapsible Dropdowns */}
            {NAV_GROUPS.filter(isGroupPermitted).map((group) => {
              const GroupIcon = group.icon;
              const isOpen = !!openGroups[group.id];
              const permittedChildren = group.items.filter(isItemPermitted);
              if (!permittedChildren.length) return null;

              const isChildActive = permittedChildren.some(item => item.href.split("?")[0] === path);

              return (
                <div key={group.id} className="pt-1">
                  {/* Dropdown Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                      isChildActive 
                        ? "text-brand-black bg-neutral-50" 
                        : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GroupIcon className={`h-4 w-4 ${isChildActive ? "text-brand-red" : "text-neutral-400"}`} />
                      <span>{group.label}</span>
                    </div>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-brand-black" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Children Links */}
                  {isOpen && (
                    <div className="mt-1 ml-4 space-y-1 border-l-2 border-neutral-100 pl-2">
                      {permittedChildren.map((item) => {
                        const ItemIcon = item.icon;
                        const active = path === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                              active
                                ? "bg-neutral-900 font-bold text-white shadow-xs"
                                : "font-medium text-neutral-600 hover:bg-neutral-100 hover:text-brand-black"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <ItemIcon className={`h-3.5 w-3.5 ${active ? "text-brand-red" : "text-neutral-400"}`} />
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase ${
                                active ? "bg-brand-red text-white" : "bg-neutral-200 text-neutral-700"
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Direct Settings Link */}
            {can(me, "company:view") && (
              <div className="pt-2">
                <Link
                  href="/app/settings"
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                    path === "/app/settings"
                      ? "bg-neutral-900 text-white shadow-xs border-l-4 border-brand-red"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-brand-black"
                  }`}
                >
                  <Settings className={`h-4 w-4 ${path === "/app/settings" ? "text-brand-red" : ""}`} />
                  <span>Company Settings</span>
                </Link>
              </div>
            )}
          </nav>

          {/* User Profile Footer in Sidebar */}
          <div className="border-t border-brand-border p-3 bg-neutral-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand-black text-xs font-black text-white shrink-0">
                  {me.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-brand-black truncate">{me.name}</p>
                  <p className="text-[10px] text-brand-muted truncate capitalize">
                    {me.roles[0] || "User"}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="rounded-lg p-2 text-neutral-400 hover:bg-white hover:text-brand-red transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 flex flex-col min-h-screen">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-brand-border bg-white/95 px-4 py-3 backdrop-blur-md md:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-neutral-500">
                <span>HBS Workspace</span>
                <span>/</span>
                <span className="capitalize font-bold text-brand-black">
                  {path.split("/")[2] || "Dashboard"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link 
                href="/kiosk"
                target="_blank"
                className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 hover:bg-emerald-100 transition shadow-xs"
              >
                <Monitor className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                <span>Face Kiosk (No Login)</span>
              </Link>

              <Link 
                href="/employee/attendance"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
              >
                <ScanFace className="h-3.5 w-3.5 text-brand-red" />
                <span>Punch Attendance</span>
              </Link>

              <Bell allHref="/employee/notifications" />

              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-brand-border text-xs">
                <span className="font-bold text-brand-black">{me.name}</span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600 font-semibold">
                  {me.roles[0] || "Staff"}
                </span>
              </div>
            </div>
          </header>

          {/* Mobile Drawer Menu when open */}
          {mobileMenuOpen && (
            <div className="border-b border-brand-border bg-white p-4 md:hidden shadow-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-xs font-bold text-brand-black uppercase">Navigation Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-neutral-400">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/app/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${
                    path === "/app/dashboard" ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>

                <Link
                  href="/app/employees"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${
                    path === "/app/employees" ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <UserCheck className="h-4 w-4" /> Employees
                </Link>

                <Link
                  href="/app/attendance"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${
                    path === "/app/attendance" ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <ScanFace className="h-4 w-4" /> Face Attendance
                </Link>

                <Link
                  href="/app/shifts"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${
                    path === "/app/shifts" ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <Clock className="h-4 w-4" /> Shift Rosters
                </Link>

                <Link
                  href="/app/payroll"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${
                    path === "/app/payroll" ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <Receipt className="h-4 w-4" /> Payroll
                </Link>

                <Link
                  href="/app/crm"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${
                    path === "/app/crm" ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" /> CRM Deals
                </Link>

                <Link
                  href="/app/operations"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${
                    path === "/app/operations" ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <Layers className="h-4 w-4" /> Operations
                </Link>

                <Link
                  href="/app/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl font-bold flex items-center gap-2 ${
                    path === "/app/settings" ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <Settings className="h-4 w-4" /> Settings
                </Link>
              </div>
            </div>
          )}

          {/* Child Page Rendering */}
          <div className="flex-1 p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function L({ children }: { children: React.ReactNode }) {
  return (
    <MeProvider>
      <Shell>{children}</Shell>
    </MeProvider>
  );
}
