"use client";
import { useCallback, useEffect, useState } from "react";
import { 
  FileSpreadsheet, 
  Calendar, 
  Download, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Filter, 
  Check, 
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { Field, Modal, inp } from "@/components/ui/modal";
import { can, useMe } from "@/components/me";
import { api, download } from "@/lib/api";

const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ["bg-blue-100 text-blue-800", "bg-amber-100 text-amber-800", "bg-purple-100 text-purple-800", "bg-green-100 text-green-800", "bg-pink-100 text-pink-800", "bg-cyan-100 text-cyan-800"];
const color = (c: string) => COLORS[[...c].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];
const currentMonthStr = () => new Date().toISOString().slice(0, 7);
const getDaysInMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};
const today = () => new Date().toLocaleDateString("en-CA");
const tm = (s?: string) => (s ? new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
const strip = (o: any) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null));
const num = (o: any, ks: string[]) => { const r = { ...o }; ks.forEach(k => { if (r[k] !== "" && r[k] != null) r[k] = Number(r[k]); }); return r; };

export default function Shifts() {
  const me = useMe(); const [tab, setTab] = useState("Roster"); const [shifts, setShifts] = useState<any[]>([]); const [emps, setEmps] = useState<any[]>([]);
  const [lists, setLists] = useState<any>({ branches: [], departments: [] }); const [msg, setMsg] = useState("");
  const loadShifts = useCallback(() => { api<any[]>("/shifts").then(setShifts).catch(e => setMsg(e.message)); }, []);
  useEffect(() => { loadShifts(); api<any>("/employees?pageSize=100&sort=fullName&dir=asc").then(r => setEmps(r.items)).catch(() => {});
    Promise.all([api<any[]>("/branches"), api<any[]>("/departments")]).then(([branches, departments]) => setLists({ branches, departments })).catch(() => {}); }, [loadShifts]);
  const tabs = ["Roster", "Shifts", ...(can(me, "shift:create") ? ["Assign"] : []), "Swaps", "Reports"];
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Shifts</h1>
    <div className="flex gap-1 border-b border-brand-border">{tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-semibold ${tab === t ? "border-b-2 border-brand-red text-brand-black" : "text-brand-muted"}`}>{t}</button>)}</div>
    {msg && <p className="rounded-lg bg-white p-3 text-sm shadow-card">{msg}</p>}
    {tab === "Roster" && <Roster lists={lists} />}
    {tab === "Shifts" && <ShiftList shifts={shifts} lists={lists} reload={loadShifts} setMsg={setMsg} />}
    {tab === "Assign" && <Assign shifts={shifts.filter(s => s.isActive)} emps={emps} lists={lists} setMsg={setMsg} />}
    {tab === "Swaps" && <Swaps setMsg={setMsg} />}
    {tab === "Reports" && <Reports shifts={shifts} lists={lists} />}</div>);
}

function Roster({ lists }: any) {
  const [month, setMonth] = useState(() => currentMonthStr());
  const [b, setB] = useState("");
  const [d, setD] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const daysInMonth = getDaysInMonth(month);
  const fromDate = `${month}-01`;

  const loadRoster = useCallback(() => {
    setLoading(true);
    api(`/shifts/roster?from=${fromDate}&days=${daysInMonth}${b ? `&branchId=${b}` : ""}${d ? `&departmentId=${d}` : ""}`)
      .then(setData)
      .catch((err) => console.error("Failed to load roster:", err))
      .finally(() => setLoading(false));
  }, [fromDate, daysInMonth, b, d]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(date.toISOString().slice(0, 7));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await download(
        `/attendance/export?month=${month}${b ? `&branchId=${b}` : ""}${d ? `&departmentId=${d}` : ""}`,
        `Attendance_Roster_${month}.csv`
      );
    } catch (e: any) {
      alert("Failed to export: " + (e?.message || e));
    } finally {
      setExporting(false);
    }
  };

  // Compute month summary stats across all cells
  const stats = {
    present: 0,
    absent: 0,
    halfDay: 0,
    leave: 0,
    weekOff: 0,
    holiday: 0,
  };

  if (data?.rows) {
    for (const r of data.rows) {
      for (const c of r.cells) {
        if (c.attendance === "PRESENT") stats.present++;
        else if (c.attendance === "ABSENT") stats.absent++;
        else if (c.attendance === "HALF_DAY") stats.halfDay++;
        else if (c.attendance === "ON_LEAVE") stats.leave++;
        else if (c.holiday) stats.holiday++;
        else if (c.weekOff) stats.weekOff++;
      }
    }
  }

  const todayStr = today();

  return (
    <div className="space-y-3">
      {/* Top Filter and Action Bar */}
      <Card className="p-3.5 border border-brand-border bg-white shadow-xs rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Month selector with prev/next controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              title="Previous Month"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 transition active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="relative">
              <input
                type="month"
                className="h-8 rounded-lg border border-neutral-300 bg-white px-2.5 text-xs font-bold text-neutral-800 shadow-xs outline-none focus:border-brand-black"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              title="Next Month"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 transition active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="ml-1 text-xs font-semibold text-neutral-500">
              ({daysInMonth} days: 1st to {daysInMonth}th)
            </span>
          </div>

          {/* Filters & Export */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-8 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 outline-none hover:border-neutral-400 focus:border-brand-black cursor-pointer"
              value={b}
              onChange={(e) => setB(e.target.value)}
            >
              <option value="">All Branches</option>
              {lists.branches?.map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>

            <select
              className="h-8 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 outline-none hover:border-neutral-400 focus:border-brand-black cursor-pointer"
              value={d}
              onChange={(e) => setD(e.target.value)}
            >
              <option value="">All Departments</option>
              {lists.departments?.map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition shadow-xs"
              title="Download Full Month Attendance in Excel (.csv)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
              <span>{exporting ? "Exporting..." : "Export Excel (.csv)"}</span>
            </button>
          </div>
        </div>

        {/* Quick Month Metrics Strip */}
        <div className="mt-3 pt-3 border-t border-neutral-200/60 flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/70">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">P</span>
            <span>Present: {stats.present}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-800 font-bold border border-red-200/70">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">A</span>
            <span>Absent: {stats.absent}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200/70">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">HD</span>
            <span>Half Day: {stats.halfDay}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 font-bold border border-purple-200/70">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-[10px] text-white">L</span>
            <span>Leave: {stats.leave}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 font-bold border border-neutral-200">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-400 text-[10px] text-white">WO</span>
            <span>Offs: {stats.weekOff}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 font-bold border border-rose-200/70">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">H</span>
            <span>Holidays: {stats.holiday}</span>
          </div>
        </div>
      </Card>

      {/* Roster Table Card */}
      <Card className="p-3 border border-brand-border bg-white shadow-xs rounded-2xl overflow-hidden">
        {loading || !data ? (
          <Skeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70">
                  <th className="sticky left-0 z-20 bg-neutral-50 px-3 py-2 text-left font-bold text-neutral-800 min-w-[160px] border-r border-neutral-200 shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                    Employee ({data.rows?.length || 0})
                  </th>
                  {data.days.map((x: string) => {
                    const dObj = new Date(x + "T00:00:00Z");
                    const dow = DOW[dObj.getUTCDay()];
                    const isSunday = dObj.getUTCDay() === 0;
                    const isToday = x === todayStr;
                    return (
                      <th
                        key={x}
                        className={`min-w-[38px] px-1 py-1.5 text-center font-normal border-r border-neutral-100 ${
                          isToday
                            ? "bg-brand-red/10 font-bold text-brand-red ring-1 ring-inset ring-brand-red/30"
                            : isSunday
                            ? "bg-neutral-100/70 text-neutral-400"
                            : "text-neutral-600"
                        }`}
                      >
                        <div className="text-[10px] uppercase font-semibold">{dow}</div>
                        <div className={`text-xs font-bold ${isToday ? "text-brand-red" : ""}`}>{x.slice(8)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.rows.map((r: any) => (
                  <tr key={r.employee.id} className="hover:bg-neutral-50/60 transition-colors">
                    {/* Employee sticky cell */}
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-semibold text-neutral-800 border-r border-neutral-200 shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                      <div className="text-xs font-bold text-neutral-900">{r.employee.fullName}</div>
                      <div className="text-[10px] font-normal text-neutral-400">{r.employee.employeeCode}</div>
                    </td>

                    {/* Day Cells */}
                    {r.cells.map((c: any, i: number) => {
                      const isPast = c.date < todayStr;
                      const isToday = c.date === todayStr;
                      const isFuture = c.date > todayStr;

                      let cellBadge = null;
                      let tooltip = `${r.employee.fullName} · ${c.date}`;

                      if (c.attendance === "PRESENT") {
                        const inT = c.checkInAt ? tm(c.checkInAt) : "—";
                        const outT = c.checkOutAt ? tm(c.checkOutAt) : "—";
                        const hrs = c.workMinutes ? (c.workMinutes / 60).toFixed(1) + "h" : "";
                        tooltip += `\nStatus: PRESENT\nIn: ${inT} | Out: ${outT} ${hrs ? `(${hrs})` : ""}`;
                        if (c.isLate) tooltip += ` (Late)`;
                        cellBadge = (
                          <div
                            title={tooltip}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-[11px] font-black text-white shadow-xs cursor-default hover:scale-110 transition"
                          >
                            P
                          </div>
                        );
                      } else if (c.attendance === "ABSENT") {
                        tooltip += `\nStatus: ABSENT`;
                        cellBadge = (
                          <div
                            title={tooltip}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-red-600 text-[11px] font-black text-white shadow-xs cursor-default hover:scale-110 transition"
                          >
                            A
                          </div>
                        );
                      } else if (c.attendance === "HALF_DAY") {
                        tooltip += `\nStatus: HALF DAY`;
                        cellBadge = (
                          <div
                            title={tooltip}
                            className="inline-flex h-6 w-7 items-center justify-center rounded-md bg-amber-500 text-[10px] font-black text-white shadow-xs cursor-default hover:scale-110 transition"
                          >
                            HD
                          </div>
                        );
                      } else if (c.attendance === "ON_LEAVE") {
                        tooltip += `\nStatus: ON LEAVE`;
                        cellBadge = (
                          <div
                            title={tooltip}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-purple-600 text-[11px] font-black text-white shadow-xs cursor-default hover:scale-110 transition"
                          >
                            L
                          </div>
                        );
                      } else if (c.holiday) {
                        tooltip += `\nHoliday: ${c.holiday}`;
                        cellBadge = (
                          <div
                            title={tooltip}
                            className="inline-flex h-6 px-1 items-center justify-center rounded-md bg-rose-100 text-[10px] font-bold text-rose-800 border border-rose-200 cursor-default"
                          >
                            H★
                          </div>
                        );
                      } else if (c.weekOff) {
                        tooltip += `\nWeekly Off`;
                        cellBadge = (
                          <div
                            title={tooltip}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-neutral-100 text-[10px] font-bold text-neutral-500 cursor-default"
                          >
                            WO
                          </div>
                        );
                      } else if (isPast) {
                        // Past work day with no punch marked
                        tooltip += `\nUnmarked (Absent)`;
                        cellBadge = (
                          <div
                            title={tooltip}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-red-100 text-[11px] font-bold text-red-700 cursor-default"
                          >
                            A
                          </div>
                        );
                      } else {
                        // Future or current day scheduled shift
                        tooltip += `\nScheduled Shift: ${c.shiftName || c.code || "None"}`;
                        cellBadge = (
                          <div
                            title={tooltip}
                            className={`inline-flex h-6 px-1.5 items-center justify-center rounded-md text-[10px] font-bold ${
                              c.code ? color(c.code) : "text-neutral-300"
                            }`}
                          >
                            {c.code ?? "·"}
                          </div>
                        );
                      }

                      return (
                        <td
                          key={i}
                          className={`p-1 text-center border-r border-neutral-100 ${
                            isToday ? "bg-brand-red/5" : ""
                          }`}
                        >
                          {cellBadge}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {!data.rows.length && (
              <p className="py-10 text-center text-xs font-semibold text-neutral-400">
                No active employees found matching criteria.
              </p>
            )}

            {/* Legend info */}
            <div className="mt-3 pt-3 border-t border-neutral-200/70 flex flex-wrap items-center gap-4 text-[11px] text-neutral-500">
              <span className="font-bold text-neutral-700">Legend:</span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-4 w-4 rounded bg-emerald-600 text-center text-[10px] font-bold text-white leading-4">P</span> Present
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-4 w-4 rounded bg-red-600 text-center text-[10px] font-bold text-white leading-4">A</span> Absent
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-4 w-4 rounded bg-amber-500 text-center text-[9px] font-bold text-white leading-4">HD</span> Half Day
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-4 w-4 rounded bg-purple-600 text-center text-[10px] font-bold text-white leading-4">L</span> Leave
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-4 w-4 rounded bg-neutral-200 text-center text-[9px] font-bold text-neutral-700 leading-4">WO</span> Weekly Off
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-4 px-1 rounded bg-rose-100 text-center text-[9px] font-bold text-rose-700 leading-4">H★</span> Holiday
              </span>
              <span className="text-neutral-400">· Future dates display assigned shift codes</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

const blank = { name: "", code: "", type: "GENERAL", startTime: "09:00", endTime: "18:00", breakMinutes: 60, graceMinutes: 10, earlyOutGraceMinutes: 10, minWorkMinutes: 480, overtimeEnabled: false, overtimeAfterMinutes: 30, weeklyOffDays: [0] as number[], branchId: "", departmentId: "", effectiveFrom: "" };
function ShiftList({ shifts, lists, reload, setMsg }: any) {
  const me = useMe(); const [f, setF] = useState<any>(null);
  const edit = (s: any) => setF({ ...blank, ...s, startTime: hm(s.startMinute), endTime: hm(s.endMinute), weeklyOffDays: s.weeklyOffDays ? s.weeklyOffDays.split(",").map(Number) : [], branchId: s.branchId ?? "", departmentId: s.departmentId ?? "", effectiveFrom: s.effectiveFrom?.slice(0, 10) ?? "" });
  const save = async () => { try { const body = strip(num({ name: f.name, code: f.code, type: f.type, startTime: f.startTime, endTime: f.endTime, breakMinutes: f.breakMinutes, graceMinutes: f.graceMinutes, earlyOutGraceMinutes: f.earlyOutGraceMinutes,
    minWorkMinutes: f.minWorkMinutes, overtimeEnabled: f.overtimeEnabled, overtimeAfterMinutes: f.overtimeAfterMinutes, weeklyOffDays: f.weeklyOffDays, branchId: f.branchId, departmentId: f.departmentId, effectiveFrom: f.effectiveFrom }, ["breakMinutes", "graceMinutes", "earlyOutGraceMinutes", "minWorkMinutes", "overtimeAfterMinutes"]));
    await api(f.id ? `/shifts/${f.id}` : "/shifts", { method: f.id ? "PATCH" : "POST", body: JSON.stringify(body) }); setF(null); setMsg("Shift saved"); reload(); } catch (e: any) { setMsg(String(e.message)); } };
  const toggle = async (s: any) => { await api(`/shifts/${s.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !s.isActive }) }); reload(); };
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  return (<Card><div className="mb-3 flex items-center"><p className="mr-auto text-sm text-brand-muted">An end time earlier than the start time means the shift runs overnight.</p>{can(me, "shift:create") && <Button onClick={() => setF({ ...blank })}>New shift</Button>}</div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">Shift</th><th>Type</th><th>Timing</th><th>Break</th><th>Grace</th><th>Weekly off</th><th>OT</th><th>Status</th><th /></tr></thead>
      <tbody>{shifts.map((s: any) => <tr key={s.id} className="border-t border-brand-border"><td className="py-2 font-semibold">{s.name} <span className={`ml-1 rounded px-1.5 py-0.5 text-xs ${color(s.code)}`}>{s.code}</span></td><td>{s.type}</td>
        <td>{hm(s.startMinute)}–{hm(s.endMinute)}{s.endMinute <= s.startMinute && <span className="ml-1 text-xs text-brand-muted">(+1 day)</span>}</td><td>{s.breakMinutes}m</td><td>{s.graceMinutes}m</td>
        <td>{s.weeklyOffDays ? s.weeklyOffDays.split(",").map((x: string) => DOW[+x]).join(", ") : "—"}</td><td>{s.overtimeEnabled ? `after ${s.overtimeAfterMinutes}m` : "—"}</td><td>{s.isActive ? "Active" : "Inactive"}</td>
        <td className="space-x-2 whitespace-nowrap text-right">{can(me, "shift:edit") && <><button className="font-semibold" onClick={() => edit(s)}>Edit</button><button className="font-semibold text-brand-red" onClick={() => toggle(s)}>{s.isActive ? "Deactivate" : "Activate"}</button></>}</td></tr>)}</tbody></table>
      {!shifts.length && <p className="py-8 text-center text-brand-muted">No shifts yet. Create your first shift.</p>}</div>
    {f && <Modal title={f.id ? "Edit shift" : "New shift"} onClose={() => setF(null)}><div className="grid gap-3 md:grid-cols-2">
      <Field label="Name"><input className={inp} value={f.name} onChange={e => set("name", e.target.value)} /></Field><Field label="Code"><input className={inp} value={f.code} onChange={e => set("code", e.target.value.toUpperCase())} /></Field>
      <Field label="Type"><select className={inp} value={f.type} onChange={e => set("type", e.target.value)}>{["GENERAL", "MORNING", "EVENING", "NIGHT", "ROTATIONAL", "FLEXIBLE", "SPLIT", "CUSTOM"].map(t => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Effective from"><input type="date" className={inp} value={f.effectiveFrom} onChange={e => set("effectiveFrom", e.target.value)} /></Field>
      <Field label="Start"><input type="time" className={inp} value={f.startTime} onChange={e => set("startTime", e.target.value)} /></Field><Field label="End"><input type="time" className={inp} value={f.endTime} onChange={e => set("endTime", e.target.value)} /></Field>
      <Field label="Break (min)"><input type="number" className={inp} value={f.breakMinutes} onChange={e => set("breakMinutes", e.target.value)} /></Field><Field label="Late grace (min)"><input type="number" className={inp} value={f.graceMinutes} onChange={e => set("graceMinutes", e.target.value)} /></Field>
      <Field label="Early-out grace (min)"><input type="number" className={inp} value={f.earlyOutGraceMinutes} onChange={e => set("earlyOutGraceMinutes", e.target.value)} /></Field><Field label="Min working (min)"><input type="number" className={inp} value={f.minWorkMinutes} onChange={e => set("minWorkMinutes", e.target.value)} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.overtimeEnabled} onChange={e => set("overtimeEnabled", e.target.checked)} />Overtime enabled</label><Field label="Overtime starts after end + (min)"><input type="number" className={inp} value={f.overtimeAfterMinutes} onChange={e => set("overtimeAfterMinutes", e.target.value)} /></Field>
      <Field label="Only for branch"><select className={inp} value={f.branchId} onChange={e => set("branchId", e.target.value)}><option value="">Any</option>{lists.branches.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Only for department"><select className={inp} value={f.departmentId} onChange={e => set("departmentId", e.target.value)}><option value="">Any</option>{lists.departments.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <div className="md:col-span-2"><p className="mb-1 text-xs font-semibold text-brand-muted">Weekly off</p><div className="flex flex-wrap gap-3">{DOW.map((n, i) => <label key={n} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={f.weeklyOffDays.includes(i)} onChange={e => set("weeklyOffDays", e.target.checked ? [...f.weeklyOffDays, i] : f.weeklyOffDays.filter((x: number) => x !== i))} />{n}</label>)}</div></div>
      <div className="md:col-span-2"><Button onClick={save} disabled={!f.name || !f.code}>Save shift</Button></div></div></Modal>}</Card>);
}

function Assign({ shifts, emps, lists, setMsg }: any) {
  const [a, setA] = useState<any>({ shiftId: "", mode: "employees", employeeIds: [], departmentId: "", branchId: "", fromDate: today(), toDate: "", isTemporary: false });
  const [r, setR] = useState<any>({ pattern: [] as string[], pick: "", employeeIds: [], startDate: today(), days: 14, stagger: true });
  const multi = (e: any) => [...e.target.selectedOptions].map((o: any) => o.value);
  const run = async (path: string, body: any, ok: (x: any) => string) => { try { setMsg(ok(await api<any>(path, { method: "POST", body: JSON.stringify(body) }))); } catch (e: any) { setMsg(String(e.message)); } };
  const empSel = (v: string[], on: (x: string[]) => void) => <select multiple size={7} className={inp} value={v} onChange={e => on(multi(e))}>{emps.map((e: any) => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>)}</select>;
  const name = (id: string) => id === "OFF" ? "OFF" : shifts.find((s: any) => s.id === id)?.code ?? "?";
  return (<div className="grid gap-4 md:grid-cols-2">
    <Card><h2 className="mb-3 font-bold">Assign shift</h2><div className="space-y-3">
      <Field label="Shift"><select className={inp} value={a.shiftId} onChange={e => setA({ ...a, shiftId: e.target.value })}><option value="">Select…</option>{shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></Field>
      <Field label="Apply to"><select className={inp} value={a.mode} onChange={e => setA({ ...a, mode: e.target.value })}><option value="employees">Selected employees</option><option value="department">A department</option><option value="branch">A branch</option></select></Field>
      {a.mode === "employees" && empSel(a.employeeIds, v => setA({ ...a, employeeIds: v }))}
      {a.mode === "department" && <select className={inp} value={a.departmentId} onChange={e => setA({ ...a, departmentId: e.target.value })}><option value="">Select…</option>{lists.departments.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
      {a.mode === "branch" && <select className={inp} value={a.branchId} onChange={e => setA({ ...a, branchId: e.target.value })}><option value="">Select…</option>{lists.branches.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
      <div className="grid grid-cols-2 gap-2"><Field label="From"><input type="date" className={inp} value={a.fromDate} onChange={e => setA({ ...a, fromDate: e.target.value })} /></Field><Field label="To (optional)"><input type="date" className={inp} value={a.toDate} onChange={e => setA({ ...a, toDate: e.target.value })} /></Field></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.isTemporary} onChange={e => setA({ ...a, isTemporary: e.target.checked })} />Temporary change (overrides the regular shift for these dates)</label>
      <Button disabled={!a.shiftId} onClick={() => run("/shifts/assignments", strip({ shiftId: a.shiftId, fromDate: a.fromDate, toDate: a.toDate, isTemporary: a.isTemporary, employeeIds: a.mode === "employees" ? a.employeeIds : undefined, departmentId: a.mode === "department" ? a.departmentId : undefined, branchId: a.mode === "branch" ? a.branchId : undefined }),
        x => `Assigned to ${x.assigned} employees${x.skipped.length ? `. Skipped (shift restricted to another branch/department): ${x.skipped.join(", ")}` : ""}`)}>Assign</Button></div></Card>
    <Card><h2 className="mb-3 font-bold">Rotational schedule</h2><div className="space-y-3">
      <Field label="Pattern (repeats daily)"><div className="flex gap-2"><select className={inp} value={r.pick} onChange={e => setR({ ...r, pick: e.target.value })}><option value="">Add…</option><option value="OFF">OFF (week off)</option>{shifts.map((s: any) => <option key={s.id} value={s.id}>{s.code}</option>)}</select>
        <Button variant="outline" disabled={!r.pick} onClick={() => setR({ ...r, pattern: [...r.pattern, r.pick], pick: "" })}>Add</Button></div></Field>
      <div className="flex flex-wrap gap-1">{r.pattern.map((p: string, i: number) => <button key={i} onClick={() => setR({ ...r, pattern: r.pattern.filter((_: any, j: number) => j !== i) })} className="rounded bg-brand-bg px-2 py-1 text-xs font-semibold">{name(p)} ×</button>)}{!r.pattern.length && <span className="text-xs text-brand-muted">e.g. M, M, M, N, N, OFF, OFF</span>}</div>
      {empSel(r.employeeIds, v => setR({ ...r, employeeIds: v }))}
      <div className="grid grid-cols-2 gap-2"><Field label="Start"><input type="date" className={inp} value={r.startDate} onChange={e => setR({ ...r, startDate: e.target.value })} /></Field><Field label="Days (max 62)"><input type="number" className={inp} value={r.days} onChange={e => setR({ ...r, days: e.target.value })} /></Field></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={r.stagger} onChange={e => setR({ ...r, stagger: e.target.checked })} />Stagger employees (each starts one step later)</label>
      <Button disabled={!r.pattern.length || !r.employeeIds.length} onClick={() => run("/shifts/rotation", { pattern: r.pattern.map((p: string) => p === "OFF" ? null : p), employeeIds: r.employeeIds, startDate: r.startDate, days: Number(r.days), stagger: r.stagger }, x => `Roster written: ${x.employees} employees × ${x.days} days (replaces existing roster entries in that range)`)}>Generate roster</Button></div></Card></div>);
}

function Swaps({ setMsg }: any) {
  const me = useMe(); const [rows, setRows] = useState<any[] | null>(null); const load = () => api<any[]>("/shifts/swaps").then(setRows).catch(() => setRows([])); useEffect(() => { load(); }, []);
  const act = async (id: string, a: string, body: any = {}) => { try { await api(`/shifts/swaps/${id}/${a}`, { method: "POST", body: JSON.stringify(body) }); load(); } catch (e: any) { setMsg(String(e.message)); } };
  return (<Card><table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">Date</th><th>Requester</th><th>With</th><th>Status</th><th /></tr></thead>
    <tbody>{rows?.map(r => <tr key={r.id} className="border-t border-brand-border"><td className="py-2">{r.date.slice(0, 10)}</td><td>{r.requester.fullName}</td><td>{r.target.fullName}</td><td>{r.status === "ACCEPTED" ? "Awaiting manager" : r.status === "PENDING" ? "Awaiting colleague" : r.status}</td>
      <td className="space-x-2 text-right">{r.status === "PENDING" && r.mineAsTarget && <><button className="font-semibold" onClick={() => act(r.id, "respond", { accept: true })}>Accept</button><button className="text-brand-red" onClick={() => act(r.id, "respond", { accept: false })}>Decline</button></>}
        {r.status === "ACCEPTED" && can(me, "shift:approve") && <button className="font-semibold text-green-700" onClick={() => act(r.id, "approve")}>Approve</button>}
        {["PENDING", "ACCEPTED"].includes(r.status) && can(me, "shift:reject") && <button className="font-semibold text-brand-red" onClick={() => act(r.id, "reject")}>Reject</button>}</td></tr>)}</tbody></table>
    {rows && !rows.length && <p className="py-8 text-center text-brand-muted">No swap requests.</p>}</Card>);
}

function Reports({ shifts, lists }: any) {
  const [q, setQ] = useState<any>({ type: "summary", from: new Date(Date.now() - 30 * 864e5).toLocaleDateString("en-CA"), to: today(), shiftId: "", branchId: "", departmentId: "" }); const [d, setD] = useState<any>(null);
  useEffect(() => { setD(null); api(`/shifts/reports?${new URLSearchParams(strip(q) as any)}`).then(setD); }, [q]);
  const t = (m?: number) => (m != null ? (m / 60).toFixed(1) + "h" : "—");
  return (<Card><div className="mb-3 flex flex-wrap gap-2">
    <select className={inp + " max-w-[11rem]"} value={q.type} onChange={e => setQ({ ...q, type: e.target.value })}>{[["summary", "Shift-wise summary"], ["late", "Late arrivals"], ["early", "Early checkouts"], ["overtime", "Overtime"], ["absent", "Absent"], ["hours", "Working hours"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    <input type="date" className={inp + " max-w-[10rem]"} value={q.from} onChange={e => setQ({ ...q, from: e.target.value })} /><input type="date" className={inp + " max-w-[10rem]"} value={q.to} onChange={e => setQ({ ...q, to: e.target.value })} />
    <select className={inp + " max-w-[10rem]"} value={q.shiftId} onChange={e => setQ({ ...q, shiftId: e.target.value })}><option value="">All shifts</option>{shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <select className={inp + " max-w-[10rem]"} value={q.branchId} onChange={e => setQ({ ...q, branchId: e.target.value })}><option value="">All branches</option>{lists.branches.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
    <select className={inp + " max-w-[10rem]"} value={q.departmentId} onChange={e => setQ({ ...q, departmentId: e.target.value })}><option value="">All departments</option>{lists.departments.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
    {!d ? <Skeleton /> : d.type === "summary" ? <table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">Shift</th><th>Records</th><th>Present</th><th>Late</th><th>Early out</th><th>Overtime</th><th>Hours</th></tr></thead>
      <tbody>{d.rows.map((r: any) => <tr key={r.code} className="border-t border-brand-border"><td className="py-2 font-semibold">{r.shift} ({r.code})</td><td>{r.records}</td><td>{r.present}</td><td>{r.late}</td><td>{r.earlyOut}</td><td>{t(r.overtimeMinutes)}</td><td>{t(r.workMinutes)}</td></tr>)}</tbody></table>
      : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">Date</th><th>Employee</th><th>Shift</th><th>In</th><th>Out</th><th>Hours</th><th>Late</th><th>OT</th><th>Status</th></tr></thead>
        <tbody>{d.rows.map((r: any) => <tr key={r.id} className="border-t border-brand-border"><td className="py-2">{r.workDate.slice(0, 10)}</td><td>{r.employee.fullName}</td><td>{r.shift?.code ?? "—"}</td><td>{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
          <td>{r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td><td>{t(r.workMinutes)}</td><td>{r.lateMinutes ? r.lateMinutes + "m" : "—"}</td><td>{r.overtimeMinutes ? r.overtimeMinutes + "m" : "—"}</td><td>{r.status}</td></tr>)}</tbody></table></div>}
    {d && !d.rows.length && <p className="py-8 text-center text-brand-muted">No records for this filter.</p>}
    <p className="mt-2 text-xs text-brand-muted">PDF/Excel export for all reports arrives in Phase 10.</p></Card>);
}
