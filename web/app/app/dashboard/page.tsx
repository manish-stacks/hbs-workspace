"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  UserCheck, 
  Calendar, 
  CreditCard, 
  ScanFace, 
  Briefcase, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Cake, 
  Award, 
  ChevronRight, 
  Zap, 
  MapPin, 
  RefreshCw, 
  Plus,
  User,
  Mail,
  Key,
  Lock,
  Check,
  Edit3
} from "lucide-react";
import dynamic from "next/dynamic";
const AttendanceTrendChart = dynamic(
  () => import("@/components/charts").then(m => m.AttendanceTrendChart),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-neutral-100" /> }
);
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Modal, inp } from "@/components/ui/modal";
import { CelebCard } from "@/components/celebration-cards";
import { useMe, can } from "@/components/me";
import { api, inr } from "@/lib/api";

interface DailyAttendanceSummary {
  present: number;
  halfDay: number;
  absent: number;
  onLeave: number;
  notMarked: number;
  total: number;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  radiusMeters?: number;
  employees?: any[];
  _count?: { employees: number };
}

interface Shift {
  id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  workDays: string;
}

export default function EnterpriseDashboard() {
  const me = useMe();
  const [sub, setSub] = useState<any>(null);
  const [empCount, setEmpCount] = useState<number | null>(null);
  const [att, setAtt] = useState<DailyAttendanceSummary | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [cel, setCel] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<number>(0);
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // Owner Personal Credentials State
  const [profile, setProfile] = useState<{ name: string; email: string }>({ name: me.name, email: "" });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  const [currPassword, setCurrPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [toastMsg, setToastMsg] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const loadAll = () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    Promise.allSettled([
      api<any>("/billing/subscription").then(setSub),
      api<any>("/employees?pageSize=1").then(r => setEmpCount(r.total)),
      api<any>("/attendance/daily?date=" + today).then(r => setAtt(r.summary)),
      api<Branch[]>("/branches").then(setBranches).catch(() => setBranches([])),
      api<Shift[]>("/shifts").then(setShifts).catch(() => setShifts([])),
      api<any>("/celebrations/upcoming?days=7").then(setCel),
      api<any>("/leaves/applications?status=PENDING&pageSize=1").then(r => setPendingLeaves(r.total || 0)),
      api<any[]>("/crm/deals").then(setDeals).catch(() => setDeals([])),
      api<any>("/auth/me").then(r => {
        if (r?.email) {
          setProfile({ name: r.name, email: r.email });
        }
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Update Owner Profile (Name & Email)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) {
      showToast("Name and email are required", "error");
      return;
    }
    try {
      const res = await api<any>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: profileName, email: profileEmail })
      });
      setProfile({ name: res.name, email: res.email });
      setShowProfileModal(false);
      showToast("Profile credentials updated successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "error");
    }
  };

  // Change Owner Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters long", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New password and confirmation do not match", "error");
      return;
    }
    try {
      await api<any>("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: currPassword,
          newPassword: newPassword
        })
      });
      setShowPasswordModal(false);
      setCurrPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully!");
    } catch (err: any) {
      showToast(err.message || "Password change failed", "error");
    }
  };

  const totalEmployees = empCount ?? (att?.total ?? 0);
  const presentEmployees = (att?.present ?? 0) + (att?.halfDay ?? 0);
  const attendanceRate = totalEmployees > 0 
    ? Math.round((presentEmployees / totalEmployees) * 100) 
    : 0;

  // Mock Attendance 7-Day Trend
  const attendanceTrendData = [
    { day: "Mon", present: Math.max(1, totalEmployees - 3), onLeave: 2, absent: 1 },
    { day: "Tue", present: Math.max(1, totalEmployees - 2), onLeave: 1, absent: 1 },
    { day: "Wed", present: Math.max(1, totalEmployees - 4), onLeave: 2, absent: 2 },
    { day: "Thu", present: Math.max(1, totalEmployees - 1), onLeave: 1, absent: 0 },
    { day: "Fri", present: Math.max(1, totalEmployees - 2), onLeave: 2, absent: 0 },
    { day: "Sat", present: Math.max(1, Math.round(totalEmployees * 0.75)), onLeave: 3, absent: 1 },
    { day: "Today", present: presentEmployees, onLeave: att?.onLeave ?? 0, absent: att?.absent ?? 0 },
  ];

  // Pipeline summary
  const pipelineValue = deals.reduce((acc, d) => acc + (Number(d.value) || 0), 0);

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
      {toastMsg && (
        <div className={`flex items-center gap-2.5 rounded-xl p-4 text-xs font-bold transition shadow-xs ${
          toastMsg.type === "success" 
            ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border border-red-300 bg-red-50 text-red-800"
        }`}>
          {toastMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />}
          <span>{toastMsg.msg}</span>
        </div>
      )}

      {/* Logged-in Owner Credentials & Account Strip */}
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-900 text-sm font-black text-white shadow-sm shrink-0">
            {(profile.name || me.name).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-brand-black">{profile.name || me.name}</h2>
              <span className="rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-red">
                {me.roles[0] || "Company Owner"}
              </span>
              {me.impersonatedBy && (
                <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Audited Session
                </span>
              )}
            </div>
            <p className="text-xs text-brand-muted flex items-center gap-1.5 mt-0.5 font-medium">
              <Mail className="h-3.5 w-3.5 text-neutral-400" />
              <span>{profile.email || "owner@domain.com"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="text-xs font-bold flex items-center gap-1.5"
            onClick={() => {
              setProfileName(profile.name || me.name);
              setProfileEmail(profile.email);
              setShowProfileModal(true);
            }}
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit Name & Email
          </Button>

          <Button
            variant="dark"
            className="text-xs font-bold flex items-center gap-1.5"
            onClick={() => {
              setCurrPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setShowPasswordModal(true);
            }}
          >
            <Key className="h-3.5 w-3.5 text-amber-400" /> Change Password
          </Button>
        </div>
      </div>

      {/* Enterprise Top Banner & Branch Filter Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-brand-black">
              Enterprise Operations Center
            </h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              ● All Systems Live
            </span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-neutral-700">
              {sub?.plan?.name || "Enterprise Tier"}
            </span>
          </div>
          <p className="mt-1 text-xs text-brand-muted">
            {todayFormatted} • Multi-Branch Attendance, Rotational Shifts, Payroll & CRM Pipeline.
          </p>
        </div>

        {/* Global Controls & Branch Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Filter Dropdown */}
          <div className="flex items-center gap-2 rounded-xl border border-brand-border bg-neutral-50 px-3 py-2 text-xs">
            <Building2 className="h-4 w-4 text-brand-muted shrink-0" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent font-bold text-brand-black outline-none cursor-pointer"
            >
              <option value="ALL">All Branches ({branches.length || 1} Offices)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <Link href="/employee/attendance">
            <Button variant="primary" className="flex items-center gap-2 text-xs shadow-sm">
              <ScanFace className="h-4 w-4" />
              Face Attendance Scanner
            </Button>
          </Link>

          {can(me, "employee:create") && (
            <Link href="/app/employees">
              <Button variant="outline" className="flex items-center gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add Staff
              </Button>
            </Link>
          )}

          <Button
            variant="outline"
            onClick={loadAll}
            className="p-2 text-brand-muted hover:text-brand-black"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Primary KPI Metrics Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Workforce */}
        <Link href="/app/employees" className="group block">
          <Card className="h-full p-5 transition hover:border-brand-black hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Total Workforce
              </span>
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-brand-black">
              {totalEmployees}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-brand-muted">
              <span>{branches.length || 1} Operational Branches</span>
              <span className="font-semibold text-blue-600 group-hover:underline">Manage &rarr;</span>
            </div>
          </Card>
        </Link>

        {/* Live Attendance */}
        <Link href="/app/attendance" className="group block">
          <Card className="h-full p-5 transition hover:border-brand-black hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Present Today
              </span>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-black text-brand-black">
                {presentEmployees}
              </p>
              <span className="text-xs font-bold text-emerald-600">
                {attendanceRate}% Check-in
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-brand-muted">
              <span>{att?.onLeave ?? 0} On Leave · {att?.absent ?? 0} Absent</span>
              <span className="font-semibold text-emerald-600 group-hover:underline">Audit &rarr;</span>
            </div>
          </Card>
        </Link>

        {/* Shift Rosters */}
        <Link href="/app/shifts" className="group block">
          <Card className="h-full p-5 transition hover:border-brand-black hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Shift Roster Hub
              </span>
              <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-brand-black">
              {shifts.length || 3}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-brand-muted">
              <span>General, Night & Rotations</span>
              <span className="font-semibold text-purple-600 group-hover:underline">Roster &rarr;</span>
            </div>
          </Card>
        </Link>

        {/* Pending Actions & CRM Value */}
        <Link href="/app/leaves" className="group block">
          <Card className="h-full p-5 transition hover:border-brand-black hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                Pending Approvals
              </span>
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-black text-brand-black">
                {pendingLeaves}
              </p>
              <span className="text-xs text-brand-muted">Leave requests</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-brand-muted">
              <span>Pipeline: <strong>{inr(pipelineValue)}</strong></span>
              <span className="font-semibold text-amber-600 group-hover:underline">Review &rarr;</span>
            </div>
          </Card>
        </Link>
      </div>

      {/* Main Operational Section: 7-Day Trend Chart & Live Multi-Branch Overview */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Attendance Trend Chart (8 Cols) */}
        <div className="lg:col-span-8">
          <Card className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border pb-4">
              <div>
                <h2 className="text-base font-bold text-brand-black">
                  Workforce Attendance Trend (7-Day Rolling)
                </h2>
                <p className="text-xs text-brand-muted">
                  Daily presence rate across all configured branches with automated leave attribution.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Present
                </span>
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> On Leave
                </span>
                <span className="flex items-center gap-1.5 text-rose-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Absent
                </span>
              </div>
            </div>

            <div className="mt-6">
              <AttendanceTrendChart data={attendanceTrendData} />
            </div>
          </Card>
        </div>

        {/* Multi-Branch Status Deck (4 Cols) */}
        <div className="lg:col-span-4">
          <Card className="h-full p-6">
            <div className="flex items-center justify-between border-b border-brand-border pb-4">
              <div>
                <h2 className="text-base font-bold text-brand-black">
                  Branch Locations
                </h2>
                <p className="text-xs text-brand-muted">Geofenced operational sites.</p>
              </div>
              <Link href="/app/branches" className="text-xs font-semibold text-brand-red hover:underline">
                View all &rarr;
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {branches.length > 0 ? (
                branches.slice(0, 4).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-xl border border-brand-border p-3 transition hover:bg-neutral-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-neutral-100 p-2 text-neutral-700">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand-black">{b.name}</p>
                        <p className="text-[11px] text-brand-muted">Code: {b.code} • {b.radiusMeters || 150}m Radius</p>
                      </div>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Active
                    </span>
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-brand-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-neutral-100 p-2 text-neutral-700">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand-black">Delhi HQ (Main Office)</p>
                        <p className="text-[11px] text-brand-muted">Code: HQ-01 • 150m Radius</p>
                      </div>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Active
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Launchpad Action Cards */}
      <div>
        <h2 className="text-base font-bold text-brand-black mb-3">
          Enterprise Operational Modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Biometrics */}
          <Link href="/app/attendance" className="group block">
            <Card className="h-full p-5 transition hover:border-brand-black hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-red-50 p-2.5 text-brand-red">
                  <ScanFace className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-red">
                  AI Anti-Spoof
                </span>
              </div>
              <h3 className="mt-3.5 font-bold text-brand-black group-hover:text-brand-red">
                In-Browser Face AI Terminal
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-brand-muted">
                Run randomized 3D liveness challenges (blink/turn), 128D mathematical descriptors, and GPS boundaries.
              </p>
              <div className="mt-4 flex items-center text-xs font-semibold text-brand-red">
                Launch attendance terminal <ArrowRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>

          {/* Shift Rosters */}
          <Link href="/app/shifts" className="group block">
            <Card className="h-full p-5 transition hover:border-brand-black hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
                  <Clock className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                  Rosters
                </span>
              </div>
              <h3 className="mt-3.5 font-bold text-brand-black group-hover:text-brand-red">
                Rotational & Night Shifts
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-brand-muted">
                Night-shift Safe Work Date attribution across midnight with colleague shift swap approval workflows.
              </p>
              <div className="mt-4 flex items-center text-xs font-semibold text-purple-600">
                Manage shift roster <ArrowRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>

          {/* Payroll Engine */}
          <Link href="/app/payroll" className="group block">
            <Card className="h-full p-5 transition hover:border-brand-black hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                  <DollarSign className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Statutory
                </span>
              </div>
              <h3 className="mt-3.5 font-bold text-brand-black group-hover:text-brand-red">
                1-Click Payroll & PF/ESI
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-brand-muted">
                Zero rounding errors with integer-paise math. Automated PF (12%), ESI (0.75%), PT slabs, and bulk PDF payslips.
              </p>
              <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600">
                Run salary cycle <ArrowRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>

          {/* Sales CRM Pipeline */}
          <Link href="/app/crm" className="group block">
            <Card className="h-full p-5 transition hover:border-brand-black hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                  Revenue
                </span>
              </div>
              <h3 className="mt-3.5 font-bold text-brand-black group-hover:text-brand-red">
                Sales Deals Pipeline
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-brand-muted">
                Multi-stage visual Kanban pipeline. Track sales representative quotas, deal stages, and win rates in one hub.
              </p>
              <div className="mt-4 flex items-center text-xs font-semibold text-orange-600">
                Open CRM pipeline <ArrowRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* EDIT PROFILE MODAL (NAME & EMAIL) */}
      {showProfileModal && (
        <Modal title="Update Owner Profile Credentials" onClose={() => setShowProfileModal(false)}>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Field label="Full Name *">
              <input
                required
                className={inp}
                placeholder="Your full name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </Field>

            <Field label="Login Email Address *">
              <input
                type="email"
                required
                className={inp}
                placeholder="name@company.com"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
              />
            </Field>

            <p className="text-[11px] text-brand-muted">
              Note: This email is used to log into this organization workspace.
            </p>

            <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
              <Button type="button" variant="outline" onClick={() => setShowProfileModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="font-bold">
                Save Credentials
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <Modal title="Change Account Password" onClose={() => setShowPasswordModal(false)}>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Field label="Current Password *">
              <input
                type="password"
                required
                className={inp}
                placeholder="Enter existing password"
                value={currPassword}
                onChange={(e) => setCurrPassword(e.target.value)}
              />
            </Field>

            <Field label="New Password (min 6 characters) *">
              <input
                type="password"
                required
                className={inp}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>

            <Field label="Confirm New Password *">
              <input
                type="password"
                required
                className={inp}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
              <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="font-bold">
                Update Password
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
