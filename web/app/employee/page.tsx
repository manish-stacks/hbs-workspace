"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ScanFace,
  Clock,
  CalendarCheck,
  CalendarOff,
  Receipt,
  Gift,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Bell,
  Pin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Skeleton, Stat } from "@/components/ui/card";
import { useMe } from "@/components/me";
import { api, inr } from "@/lib/api";

const tm = (s?: string) => (s ? new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

export default function EmployeeDashboard() {
  const me = useMe();
  const [today, setToday] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  // Live Digital Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setCurrentDate(now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, hRes, holRes, annRes, payRes] = await Promise.allSettled([
        api<any>("/attendance/me/today"),
        api<any[]>("/attendance/me"),
        api<any[]>("/shifts/holidays"),
        api<any[]>("/ops/announcements"),
        api<any[]>("/payroll/me/payslips"),
      ]);

      if (tRes.status === "fulfilled") setToday(tRes.value);
      if (hRes.status === "fulfilled") setHistory(hRes.value || []);
      if (holRes.status === "fulfilled") setHolidays(holRes.value || []);
      if (annRes.status === "fulfilled") setAnnouncements(annRes.value || []);
      if (payRes.status === "fulfilled") setPayslips(payRes.value || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openPunch = today?.open;
  const todayRec = today?.today;
  const isCheckedIn = !!openPunch;
  const isCheckedOut = !openPunch && !!todayRec?.checkOutAt;

  // Monthly stats calculations
  const presentDays = history.filter((h) => h.status === "PRESENT").length;
  const halfDays = history.filter((h) => h.status === "HALF_DAY").length;
  const leavesTaken = history.filter((h) => h.status === "ON_LEAVE").length;
  const totalMinutes = history.reduce((acc, h) => acc + (h.workMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Filter future holidays
  const upcomingHolidays = holidays
    .filter((h) => new Date(h.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top Greeting Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(ellipse_at_top_right,#FF3B30_0%,transparent_70%)] opacity-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Employee Portal</span>
              <span>·</span>
              <span className="text-neutral-300">{currentDate}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {today?.employee?.name || me.name} 👋
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-neutral-300">
              <span className="rounded-lg bg-neutral-800 border border-neutral-700 px-2.5 py-1 font-mono font-bold text-neutral-200">
                {today?.employee?.branch || "Main Office"}
              </span>
              <span>·</span>
              <span className="text-neutral-300 font-medium">
                {me.roles[0] || "Team Member"}
              </span>
            </div>
          </div>

          {/* Digital Clock Card */}
          <div className="flex flex-col items-start md:items-end rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-md">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Current Time
            </div>
            <div className="font-mono text-2xl font-black text-white tracking-wider">
              {currentTime || "12:00:00 PM"}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
              <Clock className="h-3 w-3" />
              <span>Live Attendance Sync Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Punch & Attendance Card */}
          <Card className="border border-brand-border bg-white p-6 rounded-3xl shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-brand-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-brand-black">
                  <ScanFace className="h-5 w-5 text-brand-red" />
                </div>
                <div>
                  <h2 className="text-base font-black text-brand-black">Today&apos;s Attendance Status</h2>
                  <p className="text-xs text-brand-muted">Real-time attendance record and gate punch</p>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {isCheckedIn ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    CLOCKED IN
                  </span>
                ) : isCheckedOut ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-300 px-3 py-1 text-xs font-bold text-blue-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    DAY COMPLETED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    NOT CLOCKED IN
                  </span>
                )}
              </div>
            </div>

            {/* In / Out Details Row */}
            <div className="grid grid-cols-3 gap-4 py-5 border-b border-brand-border">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Clock In</span>
                <p className="mt-1 text-lg font-black text-brand-black">
                  {tm((openPunch ?? todayRec)?.checkInAt)}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Clock Out</span>
                <p className="mt-1 text-lg font-black text-brand-black">
                  {tm(todayRec?.checkOutAt)}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Today&apos;s Status</span>
                <p className="mt-1 text-lg font-black text-brand-black capitalize">
                  {todayRec?.status ?? (openPunch ? "PRESENT" : "PENDING")}
                </p>
              </div>
            </div>

            {/* CTA Action Row */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  {today?.face?.enrolled
                    ? "Face Biometrics Active & Enrolled by HR"
                    : "Biometrics Managed by Admin (Self-Registration Locked)"}
                </span>
              </div>

              <Link
                href="/employee/attendance"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-black px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-sm"
              >
                <span>Open Punch Screen</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>

          {/* Monthly Attendance Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <Card className="p-4 rounded-2xl border border-brand-border bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase">Days Present</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-brand-black">{presentDays}</span>
                <span className="text-[11px] font-semibold text-emerald-600">days</span>
              </div>
            </Card>

            <Card className="p-4 rounded-2xl border border-brand-border bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase">Hours Worked</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-brand-black">{totalHours}</span>
                <span className="text-[11px] font-semibold text-neutral-400">hrs</span>
              </div>
            </Card>

            <Card className="p-4 rounded-2xl border border-brand-border bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase">Leaves Taken</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-brand-black">{leavesTaken}</span>
                <span className="text-[11px] font-semibold text-neutral-400">approved</span>
              </div>
            </Card>

            <Card className="p-4 rounded-2xl border border-brand-border bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase">Half Days</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-brand-black">{halfDays}</span>
                <span className="text-[11px] font-semibold text-neutral-400">logged</span>
              </div>
            </Card>
          </div>

          {/* Quick Actions Shortcuts Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Quick Shortcuts & Services
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Link
                href="/employee/leaves"
                className="group flex items-center justify-between rounded-2xl border border-brand-border bg-white p-4.5 hover:border-brand-black hover:shadow-xs transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 group-hover:scale-105 transition">
                    <CalendarOff className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">Request Leave / Time Off</h4>
                    <p className="text-[11px] text-neutral-500">Apply for annual, sick, or casual leave</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-brand-black group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/employee/payslips"
                className="group flex items-center justify-between rounded-2xl border border-brand-border bg-white p-4.5 hover:border-brand-black hover:shadow-xs transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-105 transition">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">View Payslips & Tax</h4>
                    <p className="text-[11px] text-neutral-500">Download official monthly PDF salary slips</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-brand-black group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/employee/shifts"
                className="group flex items-center justify-between rounded-2xl border border-brand-border bg-white p-4.5 hover:border-brand-black hover:shadow-xs transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 group-hover:scale-105 transition">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">My Shift Roster</h4>
                    <p className="text-[11px] text-neutral-500">Check upcoming shifts, timings & swaps</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-brand-black group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/employee/more"
                className="group flex items-center justify-between rounded-2xl border border-brand-border bg-white p-4.5 hover:border-brand-black hover:shadow-xs transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 group-hover:scale-105 transition">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">Claims & Helpdesk</h4>
                    <p className="text-[11px] text-neutral-500">Reimbursements, assets & support tickets</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-brand-black group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">
          {/* Company Announcements Card */}
          <Card className="border border-brand-border bg-white p-5 rounded-3xl shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-red" />
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-black">
                  Company Announcements
                </h3>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {announcements.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-400">
                  No new company notices at this time.
                </p>
              ) : (
                announcements.slice(0, 3).map((a) => (
                  <div key={a.id} className="rounded-2xl bg-neutral-50/80 p-3.5 border border-brand-border space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-brand-black">
                      {a.pinned && <Pin className="h-3 w-3 text-brand-red fill-brand-red" />}
                      <span>{a.title}</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 line-clamp-2 leading-relaxed">
                      {a.body}
                    </p>
                    <span className="text-[10px] text-neutral-400 block pt-1">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Upcoming Holidays Card */}
          <Card className="border border-brand-border bg-white p-5 rounded-3xl shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-black">
                  Upcoming Holidays
                </h3>
              </div>
              <Link href="/employee/shifts" className="text-[11px] font-bold text-brand-red hover:underline">
                View Calendar
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {upcomingHolidays.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-400">
                  No upcoming holidays scheduled this month.
                </p>
              ) : (
                upcomingHolidays.map((h) => (
                  <div
                    key={h.id || h.date}
                    className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 border border-brand-border"
                  >
                    <div>
                      <p className="text-xs font-bold text-brand-black">{h.name}</p>
                      <p className="text-[10px] text-neutral-500">
                        {new Date(h.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">
                      Holiday
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Organization Security Badge */}
          <Card className="border border-brand-border bg-neutral-900 text-white p-5 rounded-3xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" />
              <span>Biometric Security Policy</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Your organization enforces strict anti-spoofing biometrics. Facial scans on kiosk terminals verify 3D human liveness. Screen photos or video replays are strictly rejected.
            </p>
            <p className="text-[11px] text-neutral-400 pt-1">
              Need face biometric assistance? Please visit your local HR department.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
