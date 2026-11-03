"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inp } from "@/components/ui/modal";
import { Bal, badge } from "@/components/leave-bits";
import { can, useMe } from "@/components/me";
import { api } from "@/lib/api";
const yr = new Date().getFullYear();
export default function Leaves() {
  const me = useMe(); const [tab, setTab] = useState("Approvals"); const [msg, setMsg] = useState(""); const [types, setTypes] = useState<any[]>([]); const [emps, setEmps] = useState<any[]>([]); const [lists, setLists] = useState<any>({ b: [], d: [] });
  const loadTypes = useCallback(() => { api<any[]>("/leaves/types?all=1").then(setTypes).catch(() => {}); }, []);
  useEffect(() => { loadTypes(); api<any>("/employees?pageSize=100&sort=fullName&dir=asc").then(r => setEmps(r.items)).catch(() => {}); Promise.all([api<any[]>("/branches"), api<any[]>("/departments")]).then(([b, d]) => setLists({ b, d })).catch(() => {}); }, [loadTypes]);
  const post = async (path: string, body: any, ok: (r: any) => string) => { try { setMsg(ok(await api<any>(path, { method: "POST", body: JSON.stringify(body) }))); loadTypes(); } catch (e: any) { setMsg(String(e.message)); } };
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Leave management</h1>
    <div className="flex gap-1 border-b border-brand-border">{["Approvals", "Calendar", "Balances", "Types & policies"].map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-semibold ${tab === t ? "border-b-2 border-brand-red" : "text-brand-muted"}`}>{t}</button>)}</div>
    {msg && <p className="rounded-lg bg-white p-3 text-sm shadow-card">{msg}</p>}
    {tab === "Approvals" && <Approvals setMsg={setMsg} />}{tab === "Calendar" && <Cal />}
    {tab === "Balances" && <Balances emps={emps} post={post} />}
    {tab === "Types & policies" && <Types types={types} lists={lists} reload={loadTypes} post={post} setMsg={setMsg} />}</div>);
}
function Approvals({ setMsg }: any) {
  const me = useMe(); const [rows, setRows] = useState<any[] | null>(null); const [st, setSt] = useState("PENDING");
  const load = useCallback(() => { api<any[]>(`/leaves/applications?status=${st}`).then(setRows); }, [st]); useEffect(load, [load]);
  const act = async (id: string, a: string) => { const note = a === "reject" ? prompt("Reason for rejection?") ?? "" : ""; if (a === "reject" && !note) return; try { await api(`/leaves/${id}/${a}`, { method: "POST", body: JSON.stringify({ note: note || undefined }) }); load(); } catch (e: any) { setMsg(String(e.message)); } };
  return (<Card><select className={inp + " mb-3 max-w-[10rem]"} value={st} onChange={e => setSt(e.target.value)}>{["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map(s => <option key={s}>{s}</option>)}</select>
    {rows?.map(a => <div key={a.id} className="flex items-center justify-between border-t border-brand-border py-2 text-sm"><span><b>{a.employee.fullName}</b> · {a.leaveType.name} · {a.fromDate.slice(0, 10)}{a.toDate !== a.fromDate && ` → ${a.toDate.slice(0, 10)}`} · {+a.days}d{a.isEmergency && <span className="ml-1 text-xs text-brand-red">emergency</span>}<br /><span className="text-brand-muted">{a.reason}</span></span>
      <span className="space-x-2 whitespace-nowrap">{a.status === "PENDING" ? <>{a.leaveType.approvalLevels > 1 && <span className="text-xs text-brand-muted">Level {a.currentLevel}/{a.leaveType.approvalLevels}</span>}
        {can(me, "leave:approve") && <button className="font-semibold text-green-700" onClick={() => act(a.id, "approve")}>Approve</button>}{can(me, "leave:reject") && <button className="font-semibold text-brand-red" onClick={() => act(a.id, "reject")}>Reject</button>}</> : <span className={`rounded-full px-2 py-0.5 text-xs ${badge(a.status)}`}>{a.status}</span>}</span></div>)}
    {rows && !rows.length && <p className="py-8 text-center text-brand-muted">Nothing here.</p>}</Card>);
}
function Cal() {
  const [rows, setRows] = useState<any[]>([]); useEffect(() => { api<any[]>("/leaves/applications?status=APPROVED&upcoming=1").then(setRows); }, []);
  return (<Card><h2 className="mb-2 font-bold">Upcoming approved leave</h2>{rows.map(a => <p key={a.id} className="border-t border-brand-border py-1.5 text-sm">{a.fromDate.slice(0, 10)}{a.toDate !== a.fromDate && ` → ${a.toDate.slice(0, 10)}`} · <b>{a.employee.fullName}</b> · {a.leaveType.name} ({+a.days}d)</p>)}{!rows.length && <p className="py-6 text-center text-brand-muted">No upcoming leave.</p>}</Card>);
}
function Balances({ emps, post }: any) {
  const me = useMe(); const [e, setE] = useState(""); const [year, setYear] = useState(yr); const [rows, setRows] = useState<any[]>([]); const [enc, setEnc] = useState<any>({ leaveTypeId: "", days: 1 });
  const load = useCallback(() => { if (e) api<any[]>(`/leaves/balances?employeeId=${e}&year=${year}`).then(setRows).catch(() => setRows([])); }, [e, year]); useEffect(load, [load]);
  return (<div className="space-y-4"><Card><div className="flex flex-wrap items-end gap-2"><Field label="Employee"><select className={inp} value={e} onChange={x => setE(x.target.value)}><option value="">Select…</option>{emps.map((x: any) => <option key={x.id} value={x.id}>{x.fullName}</option>)}</select></Field>
    <Field label="Year"><select className={inp} value={year} onChange={x => setYear(+x.target.value)}>{[yr - 1, yr, yr + 1].map(y => <option key={y}>{y}</option>)}</select></Field>
    {can(me, "leave:manage") && <><Button variant="outline" onClick={() => post("/leaves/allocate", { year }, r => `Allocated ${r.balances} balances for ${year} (existing usage untouched)`)}>Allocate all for {year}</Button>
      <Button variant="outline" onClick={() => confirm(`Carry forward ${year - 1} → ${year}?`) && post("/leaves/carry-forward", { fromYear: year - 1 }, r => `Carry-forward updated for ${r.updated} balances`)}>Carry forward from {year - 1}</Button></>}</div></Card>
    <div className="grid gap-3 sm:grid-cols-3">{rows.map(b => <Bal key={b.id} b={b} />)}</div>
    {e && can(me, "leave:manage") && <Card><h2 className="mb-2 font-bold">Encash leave</h2><div className="flex flex-wrap items-end gap-2"><select className={inp + " max-w-[12rem]"} value={enc.leaveTypeId} onChange={x => setEnc({ ...enc, leaveTypeId: x.target.value })}><option value="">Leave type…</option>{rows.filter(r => r.leaveType.isPaid).map(r => <option key={r.leaveType.id} value={r.leaveType.id}>{r.leaveType.name}</option>)}</select>
      <input type="number" step="0.5" className={inp + " max-w-[6rem]"} value={enc.days} onChange={x => setEnc({ ...enc, days: +x.target.value })} /><Button disabled={!enc.leaveTypeId} onClick={() => post("/leaves/encash", { employeeId: e, leaveTypeId: enc.leaveTypeId, year, days: enc.days }, () => "Encashment recorded").then(load)}>Encash</Button></div><p className="mt-1 text-xs text-brand-muted">Only types marked encashable are accepted. The payout amount is calculated in payroll.</p></Card>}</div>);
}
function Types({ types, lists, reload, post, setMsg }: any) {
  const me = useMe(); const [pol, setPol] = useState<any[]>([]); const [p, setP] = useState<any>({ leaveTypeId: "", branchId: "", departmentId: "", annualQuota: 0 });
  const [t, setT] = useState<any>({ name: "", code: "", isPaid: true, annualQuota: 12, carryForwardMax: 0, encashable: false, approvalLevels: 1 });
  const loadPol = () => api<any[]>("/leaves/policies").then(setPol).catch(() => {}); useEffect(() => { loadPol(); }, []);
  const clean = (o: any) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== ""));
  const add = async () => { try { await api("/leaves/types", { method: "POST", body: JSON.stringify({ ...t, code: t.code.toUpperCase(), annualQuota: +t.annualQuota, carryForwardMax: +t.carryForwardMax }) }); setMsg("Leave type added"); reload(); } catch (e: any) { setMsg(String(e.message)); } };
  const addPol = async () => { try { await api("/leaves/policies", { method: "POST", body: JSON.stringify({ ...clean(p), annualQuota: +p.annualQuota }) }); loadPol(); } catch (e: any) { setMsg(String(e.message)); } };
  const toggle = async (x: any) => { await api(`/leaves/types/${x.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !x.isActive }) }); reload(); };
  return (<div className="space-y-4"><Card><div className="mb-2 flex items-center"><h2 className="mr-auto font-bold">Leave types</h2>{can(me, "leave:create") && <Button variant="outline" onClick={() => post("/leaves/types/defaults", {}, r => `Added ${r.created} default types`)}>Add defaults</Button>}</div>
    <table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-1">Type</th><th>Paid</th><th>Quota</th><th>Carry max</th><th>Levels</th><th>Encash</th><th /></tr></thead><tbody>{types.map((x: any) => <tr key={x.id} className="border-t border-brand-border"><td className="py-1.5 font-semibold">{x.name} ({x.code}){x.genderRestriction && <span className="ml-1 text-xs text-brand-muted">{x.genderRestriction}</span>}</td><td>{x.isPaid ? "Yes" : "No (LWP)"}</td><td>{+x.annualQuota}</td><td>{+x.carryForwardMax}</td><td>{x.approvalLevels}</td><td>{x.encashable ? "Yes" : "—"}</td>
      <td className="text-right">{can(me, "leave:edit") && <button className="text-brand-red" onClick={() => toggle(x)}>{x.isActive ? "Deactivate" : "Activate"}</button>}</td></tr>)}</tbody></table>
    {can(me, "leave:create") && <div className="mt-3 grid gap-2 md:grid-cols-7"><input className={inp} placeholder="Name" value={t.name} onChange={e => setT({ ...t, name: e.target.value })} /><input className={inp} placeholder="Code" value={t.code} onChange={e => setT({ ...t, code: e.target.value })} />
      <input type="number" className={inp} placeholder="Quota" value={t.annualQuota} onChange={e => setT({ ...t, annualQuota: e.target.value })} /><input type="number" className={inp} placeholder="Carry max" value={t.carryForwardMax} onChange={e => setT({ ...t, carryForwardMax: e.target.value })} />
      <select className={inp} value={t.approvalLevels} onChange={e => setT({ ...t, approvalLevels: +e.target.value })}><option value={1}>1 level</option><option value={2}>2 levels</option></select>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={t.isPaid} onChange={e => setT({ ...t, isPaid: e.target.checked })} />Paid</label><Button onClick={add} disabled={!t.name || !t.code}>Add</Button></div>}</Card>
    {can(me, "leave:manage") && <Card><h2 className="mb-2 font-bold">Branch / department quota policies</h2>
      <div className="mb-3 grid gap-2 md:grid-cols-5"><select className={inp} value={p.leaveTypeId} onChange={e => setP({ ...p, leaveTypeId: e.target.value })}><option value="">Leave type…</option>{types.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select className={inp} value={p.branchId} onChange={e => setP({ ...p, branchId: e.target.value })}><option value="">Any branch</option>{lists.b.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select className={inp} value={p.departmentId} onChange={e => setP({ ...p, departmentId: e.target.value })}><option value="">Any department</option>{lists.d.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <input type="number" className={inp} value={p.annualQuota} onChange={e => setP({ ...p, annualQuota: e.target.value })} /><Button onClick={addPol} disabled={!p.leaveTypeId}>Add policy</Button></div>
      {pol.map(x => <div key={x.id} className="flex justify-between border-t border-brand-border py-1.5 text-sm"><span>{x.leaveType.name}: <b>{+x.annualQuota}</b> days · {lists.b.find((b: any) => b.id === x.branchId)?.name ?? "any branch"} · {lists.d.find((d: any) => d.id === x.departmentId)?.name ?? "any department"}</span>
        <button className="text-brand-red" onClick={async () => { await api(`/leaves/policies/${x.id}`, { method: "DELETE" }); loadPol(); }}>Delete</button></div>)}
      <p className="mt-2 text-xs text-brand-muted">Policies apply when a balance is first created for an employee/year. Department policy beats branch policy beats the type default.</p></Card>}</div>);
}
