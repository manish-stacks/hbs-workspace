"use client";
import { useCallback, useEffect, useState } from "react";
import { 
  DollarSign, 
  Search, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Plus, 
  Sparkles, 
  Building2, 
  TrendingUp, 
  X,
  Clock,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Skeleton, Stat } from "@/components/ui/card";
import { Field, Modal, inp } from "@/components/ui/modal";
import { can, useMe } from "@/components/me";
import { api, download, inr } from "@/lib/api";
import { SalaryModal } from "@/components/salary-modal";
const prevMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toLocaleDateString("en-CA").slice(0, 7); };
const BADGE: any = { DRAFT: "bg-brand-bg text-brand-muted", SUBMITTED: "bg-amber-100 text-amber-800", APPROVED: "bg-blue-100 text-blue-800", LOCKED: "bg-green-100 text-green-700" };

export default function Payroll() {
  const [tab, setTab] = useState("Runs"); const [msg, setMsg] = useState(""); const [emps, setEmps] = useState<any[]>([]);
  useEffect(() => { api<any>("/employees?pageSize=100&sort=fullName&dir=asc").then(r => setEmps(r.items)).catch(() => {}); }, []);
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Payroll</h1>
    <div className="flex gap-1 border-b border-brand-border">{["Runs", "Salary structures", "Loans & advances", "Settings"].map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-semibold ${tab === t ? "border-b-2 border-brand-red" : "text-brand-muted"}`}>{t}</button>)}</div>
    {msg && <p className="rounded-lg bg-white p-3 text-sm shadow-card">{msg}</p>}
    {tab === "Runs" && <Runs setMsg={setMsg} />}{tab === "Salary structures" && <Structures emps={emps} setMsg={setMsg} />}{tab === "Loans & advances" && <Loans emps={emps} setMsg={setMsg} />}{tab === "Settings" && <Settings setMsg={setMsg} />}</div>);
}

function Runs({ setMsg }: any) {
  const me = useMe(); const [runs, setRuns] = useState<any[] | null>(null); const [month, setMonth] = useState(prevMonth()); const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => { api<any[]>("/payroll/runs").then(setRuns).catch(e => setMsg(e.message)); }, [setMsg]); useEffect(load, [load]);
  const create = async () => { try { const r = await api<any>("/payroll/runs", { method: "POST", body: JSON.stringify({ month }) }); setMsg(`Calculated ${r.employees} employees.${r.skippedNoStructure.length ? ` No salary structure for: ${r.skippedNoStructure.join(", ")}` : ""}`); load(); setOpen(r.run.id); } catch (e: any) { setMsg(String(e.message)); } };
  if (open) return <RunDetail id={open} back={() => { setOpen(null); load(); }} setMsg={setMsg} />;
  return (<Card>{can(me, "payroll:create") && <div className="mb-3 flex items-end gap-2"><Field label="Month"><input type="month" className={inp} value={month} onChange={e => setMonth(e.target.value)} /></Field><Button onClick={create}>Calculate payroll</Button></div>}
    {!runs ? <Skeleton /> : <table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">Month</th><th>Status</th><th>Gross</th><th>Deductions</th><th>Net</th><th /></tr></thead>
      <tbody>{runs.map(r => <tr key={r.id} className="border-t border-brand-border"><td className="py-2 font-semibold">{r.month}</td><td><span className={`rounded-full px-2 py-0.5 text-xs ${BADGE[r.status]}`}>{r.status}</span></td><td>{inr(r.totalGross)}</td><td>{inr(r.totalDeductions)}</td><td className="font-semibold">{inr(r.totalNet)}</td><td className="text-right"><button className="font-semibold" onClick={() => setOpen(r.id)}>Open</button></td></tr>)}</tbody></table>}
    {runs && !runs.length && <p className="py-8 text-center text-brand-muted">No payroll runs yet. Pick a completed month and calculate.</p>}
    <p className="mt-2 text-xs text-brand-muted">Tip: finalize attendance for every day of the month first (Attendance → Finalize day); unmarked days are counted as absent.</p></Card>);
}

function RunDetail({ id, back, setMsg }: any) {
  const me = useMe(); const [d, setD] = useState<any>(null); const [edit, setEdit] = useState<any>(null); const [b, setB] = useState(""); const [dep, setDep] = useState(""); const [lists, setLists] = useState<any>({ b: [], d: [] });
  const load = useCallback(() => { api<any>(`/payroll/runs/${id}?${new URLSearchParams({ ...(b && { branchId: b }), ...(dep && { departmentId: dep }) })}`).then(setD).catch(e => setMsg(e.message)); }, [id, b, dep, setMsg]); useEffect(load, [load]);
  useEffect(() => { Promise.all([api<any[]>("/branches"), api<any[]>("/departments")]).then(([x, y]) => setLists({ b: x, d: y })).catch(() => {}); }, []);
  const act = async (a: string, confirmMsg: string) => { if (!confirm(confirmMsg)) return; try { await api(`/payroll/runs/${id}/${a}`, { method: "POST" }); load(); setMsg(`Done: ${a}`); } catch (e: any) { setMsg(String(e.message)); } };
  const saveEdit = async () => { try { await api(`/payroll/runs/${id}/items/${edit.id}`, { method: "PATCH", body: JSON.stringify({ bonus: +edit.bonus, incentive: +edit.incentive, otherDeduction: +edit.other }) }); setEdit(null); load(); } catch (e: any) { setMsg(String(e.message)); } };
  if (!d) return <Skeleton />; const { run, items, filteredTotals: t } = d, st = run.status;
  return (<div className="space-y-4"><div className="flex flex-wrap items-center gap-2"><button className="text-sm font-semibold" onClick={back}>← Runs</button><h2 className="mr-auto text-xl font-bold">{run.month} <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${BADGE[st]}`}>{st}</span></h2>
    {st === "DRAFT" && can(me, "payroll:create") && <Button onClick={() => act("submit", "Submit for approval?")}>Submit</Button>}
    {st === "SUBMITTED" && can(me, "payroll:approve") && <Button onClick={() => act("approve", "Approve this payroll?")}>Approve</Button>}
    {["SUBMITTED", "APPROVED"].includes(st) && can(me, "payroll:reject") && <Button variant="outline" onClick={() => act("reject", "Send back to draft?")}>Send back</Button>}
    {st === "APPROVED" && can(me, "payroll:manage") && <Button variant="dark" onClick={() => act("lock", "Lock payroll and generate payslips? This cannot be undone.")}>Lock & generate payslips</Button>}</div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Gross" value={inr(t.gross)} /><Stat label="Deductions" value={inr(t.deductions)} /><Stat label="Net pay" value={inr(t.net)} /><Stat label="Employer cost (PF/ESI)" value={inr(t.employerCost)} /></div>
    <Card><div className="mb-3 flex flex-wrap gap-2"><select className={inp + " max-w-[10rem]"} value={b} onChange={e => setB(e.target.value)}><option value="">All branches</option>{lists.b.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <select className={inp + " max-w-[10rem]"} value={dep} onChange={e => setDep(e.target.value)}><option value="">All departments</option>{lists.d.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      {can(me, "payroll:export") && <><Button variant="outline" onClick={() => download(`/payroll/runs/${id}/export?type=register`, `salary-register-${run.month}.csv`)}>Salary register CSV</Button>
        {["APPROVED", "LOCKED"].includes(st) && <Button variant="outline" onClick={() => download(`/payroll/runs/${id}/export?type=bank`, `bank-transfer-${run.month}.csv`).catch(e => setMsg(e.message))}>Bank statement CSV</Button>}
        {st === "LOCKED" && <Button variant="outline" onClick={() => download(`/payroll/runs/${id}/payslips.pdf`, `payslips-${run.month}.pdf`)}>All payslips PDF</Button>}</>}</div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">Employee</th><th>Payable / LOP</th><th>OT</th><th>Gross</th><th>Deductions</th><th>Net</th><th /></tr></thead>
        <tbody>{items.map((i: any) => { const w = i.days.warnings ?? []; return <tr key={i.id} className="border-t border-brand-border"><td className="py-2 font-semibold">{i.employee.fullName}<div className="text-xs font-normal text-brand-muted">{i.employee.employeeCode} · {i.employee.branch?.name ?? "—"}</div></td>
          <td>{i.days.daysInMonth - i.days.lossDays} / {i.days.lossDays}</td><td>{i.days.otMinutes ? (i.days.otMinutes / 60).toFixed(1) + "h" : "—"}</td><td>{inr(i.gross)}</td><td title={Object.entries(i.deductions).filter(([, v]) => +(v as string) > 0).map(([k, v]) => `${k}: ${v}`).join("\n")}>{inr(i.totalDeductions)}</td>
          <td className="font-semibold">{inr(i.net)}{w.length > 0 && <span title={w.join("\n")} className="ml-1 cursor-help text-brand-red">⚠</span>}</td>
          <td className="text-right">{st === "DRAFT" && can(me, "payroll:edit") && <button className="font-semibold" onClick={() => setEdit({ id: i.id, name: i.employee.fullName, bonus: i.earnings.bonus, incentive: i.earnings.incentive, other: i.deductions.other })}>Adjust</button>}</td></tr>; })}</tbody></table>
        {!items.length && <p className="py-8 text-center text-brand-muted">No employees in this run/filter.</p>}</div></Card>
    {edit && <Modal title={`Adjust · ${edit.name}`} onClose={() => setEdit(null)}><div className="grid gap-3 sm:grid-cols-3"><Field label="Bonus"><input type="number" className={inp} value={edit.bonus} onChange={e => setEdit({ ...edit, bonus: e.target.value })} /></Field>
      <Field label="Incentive"><input type="number" className={inp} value={edit.incentive} onChange={e => setEdit({ ...edit, incentive: e.target.value })} /></Field><Field label="Other deduction"><input type="number" className={inp} value={edit.other} onChange={e => setEdit({ ...edit, other: e.target.value })} /></Field></div><Button className="mt-3" onClick={saveEdit}>Save</Button></Modal>}</div>);
}

function Structures({ emps, setMsg }: any) {
  const me = useMe();
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "MISSING" | "CONFIGURED">("ALL");
  const [activeModalEmp, setActiveModalEmp] = useState<any | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api<any[]>("/payroll/roster")
      .then((data) => setRoster(data || []))
      .catch((e) => setMsg(e.message))
      .finally(() => setLoading(false));
  }, [setMsg]);

  useEffect(() => {
    load();
  }, [load]);

  const totalStaff = roster.length;
  const configuredCount = roster.filter((r) => r.hasStructure).length;
  const missingCount = roster.filter((r) => !r.hasStructure).length;
  const totalPayrollLiability = roster.reduce((acc, r) => acc + (r.grossMonthly || 0), 0);

  const filtered = roster.filter((item) => {
    const matchSearch =
      item.employee.fullName.toLowerCase().includes(search.toLowerCase()) ||
      item.employee.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
      (item.employee.designation?.name || "").toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (filter === "MISSING") return !item.hasStructure;
    if (filter === "CONFIGURED") return item.hasStructure;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 rounded-2xl border border-brand-border bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase">Total Active Staff</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-brand-black">{totalStaff}</span>
            <span className="text-xs text-neutral-400 font-semibold">employees</span>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-brand-border bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase">Salary Configured</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{configuredCount}</span>
            <span className="text-xs text-emerald-700 font-semibold">payroll ready</span>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-brand-border bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase">Missing Salaries</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${missingCount > 0 ? "text-amber-600" : "text-neutral-400"}`}>
              {missingCount}
            </span>
            {missingCount > 0 && (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Action Required
              </span>
            )}
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-brand-border bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase">Monthly Payroll Liability</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-brand-black">{inr(totalPayrollLiability)}</span>
            <span className="text-[10px] text-neutral-400 font-semibold">/ mo</span>
          </div>
        </Card>
      </div>

      {/* Warning Alert if any missing */}
      {missingCount > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <h4 className="font-bold text-sm text-amber-950">
              {missingCount} Employee{missingCount > 1 ? "s" : ""} Without Salary Structure
            </h4>
            <p>
              Employees without a salary structure cannot be included in monthly payroll calculations. Click <b>&quot;Setup Salary&quot;</b> below to assign their monthly CTC, Basic pay, and allowances.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="border border-brand-border bg-white p-4 rounded-3xl shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-brand-border">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search staff, code, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-xs text-brand-black outline-none focus:border-brand-black"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilter("ALL")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                filter === "ALL" ? "bg-brand-black text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All Staff ({totalStaff})
            </button>
            <button
              onClick={() => setFilter("CONFIGURED")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                filter === "CONFIGURED" ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Configured ({configuredCount})
            </button>
            <button
              onClick={() => setFilter("MISSING")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                filter === "MISSING" ? "bg-amber-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Missing ({missingCount})
            </button>
          </div>
        </div>

        {/* Directory Table */}
        {loading ? (
          <Skeleton />
        ) : (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Designation & Branch</th>
                  <th className="py-2.5 px-3">Salary Status</th>
                  <th className="py-2.5 px-3">Monthly Gross (CTC)</th>
                  <th className="py-2.5 px-3">Basic Pay</th>
                  <th className="py-2.5 px-3">Statutory</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((item) => {
                  const emp = item.employee;
                  const s = item.structure;
                  return (
                    <tr key={emp.id} className="hover:bg-neutral-50/80 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-brand-black">{emp.fullName}</div>
                        <div className="font-mono text-[11px] text-neutral-400">{emp.employeeCode}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-neutral-700">
                          {emp.designation?.name || "Staff Member"}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {emp.department?.name || "General"} · {emp.branch?.name || "Main Branch"}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {item.hasStructure ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Configured ({new Date(s.effectiveFrom).toLocaleDateString()})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                            Not Configured
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {item.hasStructure ? (
                          <div>
                            <span className="font-bold text-brand-black text-sm">{inr(item.grossMonthly)}</span>
                            <span className="text-[10px] text-neutral-400 block font-mono">
                              Annual: {inr(item.annualCtc)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 font-semibold">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {item.hasStructure ? (
                          <div>
                            <span className="font-semibold text-neutral-700">{inr(s.basic)}</span>
                            <span className="text-[10px] text-neutral-400 block">
                              HRA: {inr(s.hra || 0)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {item.hasStructure ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold">
                            <span className={`px-1.5 py-0.5 rounded ${s.pfApplicable ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                              PF
                            </span>
                            <span className={`px-1.5 py-0.5 rounded ${s.esiApplicable ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                              ESI
                            </span>
                            <span className={`px-1.5 py-0.5 rounded ${s.ptApplicable ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                              PT
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {can(me, "payroll:edit") && (
                          <button
                            type="button"
                            onClick={() => setActiveModalEmp(emp)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer shadow-xs ${
                              item.hasStructure
                                ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-300"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>{item.hasStructure ? "Revise Salary" : "Setup Salary"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-8 text-center text-xs text-neutral-400">
                No matching staff records found.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Salary Modal */}
      {activeModalEmp && (
        <SalaryModal
          employee={activeModalEmp}
          onClose={() => setActiveModalEmp(null)}
          onSuccess={(msg) => {
            setMsg(msg);
            load();
          }}
        />
      )}
    </div>
  );
}

function Loans({ emps, setMsg }: any) {
  const me = useMe(); const [rows, setRows] = useState<any[]>([]); const [f, setF] = useState<any>({ employeeId: "", kind: "LOAN", principal: "", emi: "", startMonth: new Date().toLocaleDateString("en-CA").slice(0, 7) });
  const load = () => api<any[]>("/payroll/loans").then(setRows).catch(() => {}); useEffect(() => { load(); }, []);
  const save = async () => { try { await api("/payroll/loans", { method: "POST", body: JSON.stringify({ ...f, principal: +f.principal, emi: +(f.kind === "ADVANCE" ? f.principal : f.emi) }) }); setMsg("Saved"); load(); } catch (e: any) { setMsg(String(e.message)); } };
  return (<div className="space-y-4">{can(me, "payroll:create") && <Card><div className="grid gap-3 md:grid-cols-6"><Field label="Employee"><select className={inp} value={f.employeeId} onChange={e => setF({ ...f, employeeId: e.target.value })}><option value="">Select…</option>{emps.map((x: any) => <option key={x.id} value={x.id}>{x.fullName}</option>)}</select></Field>
    <Field label="Type"><select className={inp} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="LOAN">Loan (EMI)</option><option value="ADVANCE">Salary advance</option></select></Field>
    <Field label="Amount"><input type="number" className={inp} value={f.principal} onChange={e => setF({ ...f, principal: e.target.value })} /></Field>{f.kind === "LOAN" && <Field label="EMI / month"><input type="number" className={inp} value={f.emi} onChange={e => setF({ ...f, emi: e.target.value })} /></Field>}
    <Field label="Deduct from"><input type="month" className={inp} value={f.startMonth} onChange={e => setF({ ...f, startMonth: e.target.value })} /></Field><div className="flex items-end"><Button disabled={!f.employeeId || !f.principal} onClick={save}>Add</Button></div></div></Card>}
    <Card><table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">Employee</th><th>Type</th><th>Amount</th><th>EMI</th><th>Repaid</th><th>From</th><th>Status</th><th /></tr></thead>
      <tbody>{rows.map(l => <tr key={l.id} className="border-t border-brand-border"><td className="py-2">{l.employee.fullName}</td><td>{l.kind}</td><td>{inr(l.principal)}</td><td>{inr(l.emi)}</td><td>{inr(l.repaid)}</td><td>{l.startMonth}</td><td>{l.status}</td>
        <td className="text-right">{l.status === "ACTIVE" && can(me, "payroll:edit") && <button className="text-brand-red" onClick={async () => { await api(`/payroll/loans/${l.id}/close`, { method: "POST" }); load(); }}>Close</button>}</td></tr>)}</tbody></table>{!rows.length && <p className="py-6 text-center text-brand-muted">None.</p>}
      <p className="mt-2 text-xs text-brand-muted">EMIs are deducted automatically each run and booked as repaid when the run is locked.</p></Card></div>);
}

function Settings({ setMsg }: any) {
  const me = useMe(); const [c, setC] = useState<any>(null); const [slabs, setSlabs] = useState("");
  useEffect(() => { api<any>("/payroll/settings").then(x => { setC(x); setSlabs(x.ptSlabs.map((s: any) => `${s.min},${s.amount}`).join("\n")); }).catch(() => {}); }, []);
  if (!c) return <Skeleton />;
  const save = async () => { try { const ptSlabs = slabs.split("\n").map(l => l.trim()).filter(Boolean).map(l => { const [min, amount] = l.split(",").map(Number); return { min, amount }; });
    await api("/payroll/settings", { method: "PUT", body: JSON.stringify({ ...c, ptSlabs }) }); setMsg("Payroll settings saved"); } catch (e: any) { setMsg(String(e.message)); } };
  const num = (k: string, l: string) => <Field key={k} label={l}><input type="number" step="any" className={inp} value={c[k]} onChange={e => setC({ ...c, [k]: +e.target.value })} /></Field>;
  return (<Card><p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Defaults are common Indian statutory values, not advice. Statutory rates, ceilings and professional-tax slabs change and vary by state — confirm them with your CA/payroll consultant before running live payroll.</p>
    <div className="grid gap-3 md:grid-cols-4">{num("pfRate", "PF rate %")}{num("pfWageCeiling", "PF wage ceiling ₹")}{num("esiEmployeeRate", "ESI employee %")}{num("esiEmployerRate", "ESI employer %")}{num("esiGrossLimit", "ESI wage limit ₹")}{num("otMultiplier", "Overtime multiplier")}{num("standardDayHours", "Standard day hours")}
      <Field label="Day basis"><select className={inp} value={c.dayBasis} onChange={e => setC({ ...c, dayBasis: e.target.value })}><option value="CALENDAR">Calendar days in month</option><option value="FIXED30">Fixed 30 days</option></select></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.pfCeilingApplies} onChange={e => setC({ ...c, pfCeilingApplies: e.target.checked })} />Cap PF at wage ceiling</label></div>
    <Field label="Professional tax slabs (one per line: monthly gross from ₹, tax ₹)"><textarea className={inp + " h-24 max-w-xs font-mono"} value={slabs} onChange={e => setSlabs(e.target.value)} /></Field>
    {can(me, "payroll:manage") && <Button className="mt-3" onClick={save}>Save settings</Button>}</Card>);
}
