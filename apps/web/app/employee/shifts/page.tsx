"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inp } from "@/components/ui/modal";
import { api } from "@/lib/api";
export default function EmpShifts() {
  const [days, setDays] = useState<any[]>([]); const [col, setCol] = useState<any[]>([]); const [sw, setSw] = useState<any[]>([]); const [hol, setHol] = useState<any[]>([]); const [f, setF] = useState({ targetId: "", date: "" }); const [msg, setMsg] = useState("");
  const load = useCallback(() => { const t = new Date().toLocaleDateString("en-CA"); api<any[]>(`/shifts/mine?from=${t}&days=14`).then(setDays).catch(e => setMsg(e.message)); api<any[]>("/shifts/swaps").then(setSw).catch(() => {}); api<any[]>("/holidays").then(setHol).catch(() => {}); }, []);
  useEffect(() => { load(); api<any[]>("/shifts/colleagues").then(setCol).catch(() => {}); }, [load]);
  const req = async () => { try { await api("/shifts/swaps", { method: "POST", body: JSON.stringify(f) }); setMsg("Swap request sent to your colleague"); setF({ targetId: "", date: "" }); load(); } catch (e: any) { setMsg(String(e.message)); } };
  const respond = async (id: string, accept: boolean) => { await api(`/shifts/swaps/${id}/respond`, { method: "POST", body: JSON.stringify({ accept }) }); load(); };
  const up = hol.filter(h => h.date.slice(0, 10) >= new Date().toLocaleDateString("en-CA"));
  return (<><h1 className="text-2xl font-bold">My shifts</h1>{msg && <p className="rounded-lg bg-white p-3 text-sm shadow-card">{msg}</p>}
    <Card><h2 className="mb-2 font-bold">Next 14 days</h2>{days.map(d => <div key={d.date} className="flex justify-between border-t border-brand-border py-2 text-sm"><span>{new Date(d.date + "T00:00:00Z").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</span>
      <span className="font-semibold">{d.holiday ? `Holiday · ${d.holiday}` : d.weekOff ? "Weekly off" : d.shift ? `${d.shift.name} · ${d.shift.start}–${d.shift.end}` : <span className="font-normal text-brand-muted">No shift</span>}</span></div>)}</Card>
    <Card><h2 className="mb-2 font-bold">Request a shift swap</h2><div className="grid gap-3 sm:grid-cols-3"><Field label="Colleague"><select className={inp} value={f.targetId} onChange={e => setF({ ...f, targetId: e.target.value })}><option value="">Select…</option>{col.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}</select></Field>
      <Field label="Date"><input type="date" className={inp} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field><div className="flex items-end"><Button disabled={!f.targetId || !f.date} onClick={req}>Send</Button></div></div>
      {sw.map(s => <div key={s.id} className="mt-2 flex justify-between border-t border-brand-border pt-2 text-sm"><span>{s.date.slice(0, 10)} · {s.requester.fullName} ⇄ {s.target.fullName}</span>
        <span>{s.status === "PENDING" && s.mineAsTarget ? <><button className="mr-2 font-semibold" onClick={() => respond(s.id, true)}>Accept</button><button className="text-brand-red" onClick={() => respond(s.id, false)}>Decline</button></> : <b>{s.status === "ACCEPTED" ? "Awaiting manager" : s.status}</b>}</span></div>)}</Card>
    <Card><h2 className="mb-2 font-bold">Upcoming holidays</h2>{up.slice(0, 8).map(h => <p key={h.id} className="border-t border-brand-border py-1 text-sm">{h.date.slice(0, 10)} · {h.name} {h.type === "OPTIONAL" && <span className="text-brand-muted">(optional)</span>}</p>)}{!up.length && <p className="text-sm text-brand-muted">None scheduled.</p>}</Card></>);
}
