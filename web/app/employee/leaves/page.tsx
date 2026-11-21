"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inp } from "@/components/ui/modal";
import { Bal, badge } from "@/components/leave-bits";
import { api } from "@/lib/api";
export default function EmpLeaves() {
  const [bal, setBal] = useState<any[]>([]); const [types, setTypes] = useState<any[]>([]); const [apps, setApps] = useState<any[]>([]); const [msg, setMsg] = useState("");
  const [f, setF] = useState<any>({ leaveTypeId: "", fromDate: "", toDate: "", isHalfDay: false, isEmergency: false, reason: "" });
  const load = useCallback(() => { api<any[]>("/leaves/me/balances").then(setBal).catch(e => setMsg(e.message)); api<any[]>("/leaves/me/applications").then(setApps).catch(() => {}); }, []);
  useEffect(() => { load(); api<any[]>("/leaves/types").then(setTypes).catch(() => {}); }, [load]);
  const submit = async () => { try { await api("/leaves/apply", { method: "POST", body: JSON.stringify({ ...f, toDate: f.isHalfDay ? f.fromDate : f.toDate }) }); setMsg("Leave applied"); setF({ ...f, reason: "" }); load(); } catch (e: any) { setMsg(String(e.message)); } };
  const cancel = async (id: string) => { if (confirm("Cancel this leave?")) try { await api(`/leaves/${id}/cancel`, { method: "POST" }); load(); } catch (e: any) { setMsg(e.message); } };
  return (<><h1 className="text-2xl font-bold">Leaves</h1>{msg && <p className="rounded-lg bg-white p-3 text-sm shadow-card">{msg}</p>}
    <div className="grid gap-3 sm:grid-cols-2">{bal.map(b => <Bal key={b.id} b={b} />)}</div>
    <Card><h2 className="mb-3 font-bold">Apply for leave</h2><div className="grid gap-3 sm:grid-cols-2">
      <Field label="Type"><select className={inp} value={f.leaveTypeId} onChange={e => setF({ ...f, leaveTypeId: e.target.value })}><option value="">Select…</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
      <Field label="From"><input type="date" className={inp} value={f.fromDate} onChange={e => setF({ ...f, fromDate: e.target.value })} /></Field>
      {!f.isHalfDay && <Field label="To"><input type="date" className={inp} value={f.toDate} onChange={e => setF({ ...f, toDate: e.target.value })} /></Field>}
      <div className="flex items-end gap-4 text-sm"><label className="flex gap-1"><input type="checkbox" checked={f.isHalfDay} onChange={e => setF({ ...f, isHalfDay: e.target.checked })} />Half day</label><label className="flex gap-1"><input type="checkbox" checked={f.isEmergency} onChange={e => setF({ ...f, isEmergency: e.target.checked })} />Emergency</label></div>
      <div className="sm:col-span-2"><Field label="Reason"><input className={inp} value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></Field></div>
      <div><Button onClick={submit} disabled={!f.leaveTypeId || !f.fromDate || (!f.isHalfDay && !f.toDate) || f.reason.length < 3}>Submit</Button></div></div>
      <p className="mt-2 text-xs text-brand-muted">Holidays and weekly offs inside the range are not deducted.</p></Card>
    <Card><h2 className="mb-2 font-bold">My applications</h2>{apps.map(a => <div key={a.id} className="flex items-center justify-between border-t border-brand-border py-2 text-sm">
      <span><b>{a.leaveType.name}</b> · {a.fromDate.slice(0, 10)}{a.toDate !== a.fromDate && ` → ${a.toDate.slice(0, 10)}`} · {+a.days}d{a.isHalfDay && " (half)"}<br /><span className="text-brand-muted">{a.reason}{a.approvals.filter((x: any) => x.note).map((x: any) => ` · "${x.note}"`)}</span></span>
      <span className="space-x-2 whitespace-nowrap"><span className={`rounded-full px-2 py-0.5 text-xs ${badge(a.status)}`}>{a.status}{a.status === "PENDING" && a.currentLevel > 1 ? " (L2)" : ""}</span>{["PENDING", "APPROVED"].includes(a.status) && <button className="text-brand-red" onClick={() => cancel(a.id)}>Cancel</button>}</span></div>)}
      {!apps.length && <p className="py-4 text-center text-sm text-brand-muted">No applications yet.</p>}</Card></>);
}
