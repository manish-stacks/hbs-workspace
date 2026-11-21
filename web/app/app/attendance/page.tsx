"use client";
import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, Download, Filter, Calendar, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Skeleton, Stat } from "@/components/ui/card";
import { Field, Modal, inp } from "@/components/ui/modal";
import { FaceCapture } from "@/components/face-capture";
import { can, useMe } from "@/components/me";
import { api, download } from "@/lib/api";

const tm = (s?: string) => (s ? new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
const ST = ["PRESENT", "ABSENT", "HALF_DAY", "WEEKLY_OFF", "HOLIDAY", "ON_LEAVE"];
const currentMonthStr = () => new Date().toISOString().slice(0, 7);

export default function Attendance() {
  const me = useMe();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [d, setD] = useState<any>(null);
  const [corr, setCorr] = useState<any[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [m, setM] = useState<any>(null);
  const [face, setFace] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [lists, setLists] = useState<any>({ branches: [], departments: [] });

  // Export Modal state
  const [showExport, setShowExport] = useState(false);
  const [exportMode, setExportMode] = useState<"month" | "custom">("month");
  const [exportMonth, setExportMonth] = useState(() => currentMonthStr());
  const [exportFrom, setExportFrom] = useState(() => new Date().toISOString().slice(0, 8) + "01");
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportBranch, setExportBranch] = useState("");
  const [exportDept, setExportDept] = useState("");
  const [exportStatus, setExportStatus] = useState("ALL");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setD(null);
    api(`/attendance/daily?date=${date}`).then(setD).catch((e) => setMsg(e.message));
    api<any[]>("/attendance/corrections?status=PENDING").then(setCorr).catch(() => {});
  }, [date]);

  useEffect(() => {
    load();
    Promise.all([api<any[]>("/branches"), api<any[]>("/departments")])
      .then(([branches, departments]) => setLists({ branches, departments }))
      .catch(() => {});
  }, [load]);

  const save = async () => {
    try {
      const ids = m.ids as string[];
      const iso = (t: string) => (t ? new Date(`${date}T${t}`).toISOString() : undefined);
      if (ids.length === 1) {
        await api("/attendance/manual", {
          method: "POST",
          body: JSON.stringify({
            employeeId: ids[0],
            workDate: date,
            status: m.status,
            checkInAt: iso(m.inT),
            checkOutAt: iso(m.outT),
            note: m.note,
          }),
        });
      } else {
        await api("/attendance/bulk", {
          method: "POST",
          body: JSON.stringify({ employeeIds: ids, workDate: date, status: m.status, note: m.note }),
        });
      }
      setM(null);
      setSel([]);
      setMsg("Attendance updated");
      load();
    } catch (e: any) {
      setMsg(String(e.message));
    }
  };

  const decide = async (id: string, a: "approve" | "reject") => {
    try {
      await api(`/attendance/corrections/${id}/${a}`, { method: "POST", body: JSON.stringify({}) });
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  const enroll = async (r: any) => {
    try {
      await api("/face/enroll", {
        method: "POST",
        body: JSON.stringify({
          employeeId: face.id,
          descriptor: r.descriptor,
          challengeId: r.challengeId,
          liveness: true,
          consent: true,
        }),
      });
      setMsg(`Face registered for ${face.fullName}`);
      load();
    } catch (e: any) {
      setMsg(String(e.message));
    }
    setFace(null);
  };

  const finalize = async () => {
    if (!confirm("Mark every unmarked employee on this date as Absent / Weekly off / Holiday? (completed days only)")) return;
    try {
      const r = await api<any>("/attendance/finalize", { method: "POST", body: JSON.stringify({ date }) });
      setMsg(`Finalized: ${r.created} records created`);
      load();
    } catch (e: any) {
      setMsg(String(e.message));
    }
  };

  const handleDownloadExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams();
      if (exportMode === "month") {
        p.set("month", exportMonth);
      } else {
        p.set("from", exportFrom);
        p.set("to", exportTo);
      }
      if (exportBranch) p.set("branchId", exportBranch);
      if (exportDept) p.set("departmentId", exportDept);
      if (exportStatus && exportStatus !== "ALL") p.set("status", exportStatus);

      const filename = exportMode === "month" ? `Attendance_${exportMonth}.csv` : `Attendance_${exportFrom}_to_${exportTo}.csv`;
      await download(`/attendance/export?${p.toString()}`, filename);
      setShowExport(false);
      setMsg("Attendance report downloaded successfully!");
    } catch (err: any) {
      alert("Failed to export attendance: " + (err?.message || err));
    } finally {
      setExporting(false);
    }
  };

  const s = d?.summary;

  return (
    <div className="space-y-4">
      {/* Top Bar with Date, Export, Finalize and Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Attendance</h1>
          <input
            type="date"
            className={inp + " max-w-[10rem] font-medium"}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export to Excel Button with Filters */}
          <Button
            variant="outline"
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <span>Export Excel</span>
          </Button>

          {can(me, "attendance:manage") && (
            <Button variant="outline" onClick={finalize}>
              Finalize day
            </Button>
          )}

          {can(me, "attendance:edit") && (
            <Button
              disabled={!sel.length}
              onClick={() => setM({ ids: sel, status: "PRESENT", inT: "", outT: "", note: "" })}
            >
              Mark selected ({sel.length})
            </Button>
          )}
        </div>
      </div>

      {msg && <p className="rounded-lg bg-white p-3 text-sm shadow-card">{msg}</p>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
        {s ? (
          [
            ["Total", s.total],
            ["Present", s.present],
            ["Half day", s.halfDay],
            ["Absent", s.absent],
            ["On leave", s.onLeave],
            ["Off / holiday", s.weeklyOff + s.holiday],
            ["Not marked", s.notMarked],
          ].map(([l, v]) => <Stat key={l as string} label={l as string} value={v} />)
        ) : (
          <Skeleton />
        )}
      </div>

      {/* Pending Corrections */}
      {!!corr.length && (
        <Card>
          <h2 className="mb-2 font-bold">Pending corrections</h2>
          {corr.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-t border-brand-border py-2 text-sm">
              <span>
                <b>{c.employee.fullName}</b> · {c.workDate.slice(0, 10)} · {c.requestedStatus ?? ""}{" "}
                {tm(c.requestedIn)}–{tm(c.requestedOut)} · {c.reason}
              </span>
              <span className="space-x-2">
                {can(me, "attendance:approve") && (
                  <button className="font-semibold text-green-700" onClick={() => decide(c.id, "approve")}>
                    Approve
                  </button>
                )}
                {can(me, "attendance:reject") && (
                  <button className="font-semibold text-brand-red" onClick={() => decide(c.id, "reject")}>
                    Reject
                  </button>
                )}
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* Daily Records Table */}
      <Card>
        {!d ? (
          <Skeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-brand-muted">
                <tr>
                  <th className="w-8" />
                  <th className="py-2">Employee</th>
                  <th>Branch</th>
                  <th>Shift</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Via</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r: any) => (
                  <tr key={r.employee.id} className="border-t border-brand-border">
                    <td>
                      <input
                        type="checkbox"
                        checked={sel.includes(r.employee.id)}
                        onChange={(e) =>
                          setSel(e.target.checked ? [...sel, r.employee.id] : sel.filter((x) => x !== r.employee.id))
                        }
                      />
                    </td>
                    <td className="py-2 font-semibold">
                      {r.employee.fullName}
                      <div className="text-xs font-normal text-brand-muted">{r.employee.employeeCode}</div>
                    </td>
                    <td>{r.employee.branch ?? "—"}</td>
                    <td>{r.shift?.code ?? "—"}</td>
                    <td>{tm(r.attendance?.checkInAt)}</td>
                    <td>{tm(r.attendance?.checkOutAt)}</td>
                    <td>{r.attendance?.workMinutes != null ? (r.attendance.workMinutes / 60).toFixed(1) : "—"}</td>
                    <td>
                      {r.attendance?.status ?? <span className="text-brand-muted">{r.expected ?? "Not marked"}</span>}
                      {r.attendance?.isLate && (
                        <span className="ml-1 text-xs text-brand-red">late {r.attendance.lateMinutes}m</span>
                      )}
                      {r.attendance?.overtimeMinutes > 0 && (
                        <span className="ml-1 text-xs text-green-700">OT {r.attendance.overtimeMinutes}m</span>
                      )}
                      {r.attendance?.isEarlyOut && (
                        <span className="ml-1 text-xs text-amber-700">early out</span>
                      )}
                    </td>
                    <td>{r.attendance?.method ?? "—"}</td>
                    <td className="whitespace-nowrap text-right">
                      {can(me, "attendance:manage") && (
                        <button
                          className="font-semibold hover:text-brand-red text-xs"
                          onClick={() => setFace(r.employee)}
                        >
                          {r.employee.faceEnrolled ? "Re-enroll face" : "Enroll face"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!d.rows.length && <p className="py-10 text-center text-brand-muted">No employees to show.</p>}
          </div>
        )}
      </Card>

      {/* Manual Mark Modal */}
      {m && (
        <Modal title={`Mark attendance · ${date}`} onClose={() => setM(null)}>
          <div className="space-y-3">
            <Field label="Status">
              <select className={inp} value={m.status} onChange={(e) => setM({ ...m, status: e.target.value })}>
                {ST.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            {m.ids.length === 1 && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="In time">
                  <input type="time" className={inp} value={m.inT} onChange={(e) => setM({ ...m, inT: e.target.value })} />
                </Field>
                <Field label="Out time">
                  <input type="time" className={inp} value={m.outT} onChange={(e) => setM({ ...m, outT: e.target.value })} />
                </Field>
              </div>
            )}
            <Field label="Reason (audited)">
              <input className={inp} value={m.note} onChange={(e) => setM({ ...m, note: e.target.value })} />
            </Field>
            <Button onClick={save} disabled={m.note.length < 3}>
              Save
            </Button>
          </div>
        </Modal>
      )}

      {/* Face Enroll Modal */}
      {face && (
        <Modal title={`Enroll face · ${face.fullName}`} onClose={() => setFace(null)}>
          <p className="mb-3 text-sm text-brand-muted">
            Only proceed with the employee's consent — they must be present in front of this device.
          </p>
          <FaceCapture onCancel={() => setFace(null)} onResult={enroll} />
        </Modal>
      )}

      {/* Export Attendance Excel Filter Modal */}
      {showExport && (
        <Modal title="Export Attendance Report (Excel / CSV)" onClose={() => setShowExport(false)}>
          <div className="space-y-4">
            <p className="text-xs text-neutral-500">
              Download clean, formatted attendance sheets compatible with Microsoft Excel, Google Sheets, and Payroll systems.
            </p>

            {/* Mode selection: Month vs Custom Range */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1.5">Date Filter Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportMode("month")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                    exportMode === "month"
                      ? "border-brand-black bg-brand-black text-white shadow-xs"
                      : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  Full Month (1st to 30/31st)
                </button>
                <button
                  type="button"
                  onClick={() => setExportMode("custom")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                    exportMode === "custom"
                      ? "border-brand-black bg-brand-black text-white shadow-xs"
                      : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  Custom Date Range
                </button>
              </div>
            </div>

            {/* Date Pickers */}
            {exportMode === "month" ? (
              <Field label="Select Month">
                <input
                  type="month"
                  className={inp}
                  value={exportMonth}
                  onChange={(e) => setExportMonth(e.target.value)}
                />
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Field label="From Date">
                  <input
                    type="date"
                    className={inp}
                    value={exportFrom}
                    onChange={(e) => setExportFrom(e.target.value)}
                  />
                </Field>
                <Field label="To Date">
                  <input
                    type="date"
                    className={inp}
                    value={exportTo}
                    onChange={(e) => setExportTo(e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* Branch and Department filters */}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Branch Office">
                <select className={inp} value={exportBranch} onChange={(e) => setExportBranch(e.target.value)}>
                  <option value="">All Branches</option>
                  {lists.branches?.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Department">
                <select className={inp} value={exportDept} onChange={(e) => setExportDept(e.target.value)}>
                  <option value="">All Departments</option>
                  {lists.departments?.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Status Filter */}
            <Field label="Attendance Status">
              <select className={inp} value={exportStatus} onChange={(e) => setExportStatus(e.target.value)}>
                <option value="ALL">All Attendance Statuses</option>
                <option value="PRESENT">Present Only (P)</option>
                <option value="HALF_DAY">Half Day Only (HD)</option>
                <option value="ABSENT">Absent Only (A)</option>
                <option value="ON_LEAVE">On Leave Only (L)</option>
              </select>
            </Field>

            {/* Download Button */}
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowExport(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDownloadExport}
                disabled={exporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span>{exporting ? "Generating Excel..." : "Download Excel (.csv)"}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
