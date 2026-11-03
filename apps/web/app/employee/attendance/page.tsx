"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Modal, inp } from "@/components/ui/modal";
import { FaceCapture, SelfieCapture } from "@/components/face-capture";
import { api } from "@/lib/api";

const getLoc = () => new Promise<{ lat?: number; lng?: number; accuracy?: number }>(res => !navigator.geolocation ? res({}) :
  navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }), () => res({}), { enableHighAccuracy: true, timeout: 10000 }));
const tm = (s?: string) => (s ? new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

export default function EmpAttendance() {
  const [t, setT] = useState<any>(null); const [hist, setHist] = useState<any[]>([]); const [corr, setCorr] = useState<any[]>([]);
  const [method, setMethod] = useState("FACE"); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [cap, setCap] = useState<null | { type: string; kind: "FACE" | "SELFIE" | "ENROLL" }>(null); const [consent, setConsent] = useState(false); const [form, setForm] = useState<any>(null);
  const load = useCallback(() => { api("/attendance/me/today").then(setT).catch(e => setMsg(e.message)); api<any[]>("/attendance/me").then(setHist).catch(() => {}); api<any[]>("/attendance/corrections").then(setCorr).catch(() => {}); }, []);
  useEffect(load, [load]);
  const send = async (body: any) => { setBusy(true); try { await api("/attendance/punch", { method: "POST", body: JSON.stringify(body) }); setMsg(`${body.type === "CHECK_IN" ? "Checked in" : "Checked out"} successfully`); load(); } catch (e: any) { setMsg(String(e.message)); } setBusy(false); };
  const start = async (type: string) => { setMsg("");
    if (method === "GPS") return send({ type, method, ...(await getLoc()) });
    setCap({ type, kind: method as any }); };
  const faceDone = async (type: string, r: any) => { setCap(null); await send({ type, method: "FACE", descriptor: r.descriptor, challengeId: r.challengeId, liveness: true, ...(await getLoc()) }); };
  const selfieDone = async (type: string, selfie: string) => { setCap(null); await send({ type, method: "SELFIE", selfie, ...(await getLoc()) }); };
  const enrollDone = async (r: any) => { setCap(null); try { await api("/face/enroll", { method: "POST", body: JSON.stringify({ descriptor: r.descriptor, challengeId: r.challengeId, liveness: true, consent: true }) }); setMsg("Face registered"); load(); } catch (e: any) { setMsg(String(e.message)); } };
  const submitCorr = async () => { try { const b: any = { workDate: form.workDate, reason: form.reason, requestedStatus: form.status || undefined };
    if (form.inT) b.requestedIn = new Date(`${form.workDate}T${form.inT}`).toISOString(); if (form.outT) b.requestedOut = new Date(`${form.workDate}T${form.outT}`).toISOString();
    await api("/attendance/corrections", { method: "POST", body: JSON.stringify(b) }); setForm(null); setMsg("Correction request sent"); load(); } catch (e: any) { setMsg(String(e.message)); } };
  const open = t?.open, rec = t?.today;
  return (<>
    <h1 className="text-2xl font-bold">Attendance</h1>{msg && <p className="rounded-lg bg-white p-3 text-sm shadow-card">{msg}</p>}
    <Card><p className="text-sm text-brand-muted">{t?.employee?.name} · {t?.employee?.branch ?? "No branch"}{t?.employee?.geofenced && " · location verified"}</p>
      <div className="mt-2 flex gap-8 text-sm"><span>In: <b>{tm((open ?? rec)?.checkInAt)}</b></span><span>Out: <b>{tm(rec?.checkOutAt)}</b></span><span>Status: <b>{rec?.status ?? (open ? "PRESENT" : "—")}</b></span></div>
      <div className="mt-4 flex flex-wrap items-center gap-2"><select className={inp + " max-w-[10rem]"} value={method} onChange={e => setMethod(e.target.value)}><option value="FACE">Face</option><option value="SELFIE">Selfie</option><option value="GPS">GPS only</option></select>
        <Button disabled={busy || !!open} onClick={() => start("CHECK_IN")}>Check in</Button><Button variant="dark" disabled={busy || !open} onClick={() => start("CHECK_OUT")}>Check out</Button></div>
      {method === "FACE" && t && !t.face.enrolled && <p className="mt-2 text-sm text-brand-red">Register your face below before using face attendance.</p>}</Card>
    <Card><h2 className="mb-2 font-bold">Face registration</h2>
      <p className="text-sm text-brand-muted">{t?.face.enrolled ? `Registered on ${new Date(t.face.consentAt).toLocaleDateString()}.` : "Not registered."} Your face template is stored encrypted and used only for attendance verification. You can withdraw consent at any time.</p>
      <label className="mt-2 flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />I consent to my facial biometric data being processed by my employer for attendance.</label>
      <div className="mt-3 flex gap-2"><Button disabled={!consent} onClick={() => setCap({ type: "", kind: "ENROLL" })}>{t?.face.enrolled ? "Re-register face" : "Register face"}</Button>
        {t?.face.enrolled && <Button variant="outline" onClick={async () => { await api(`/face/${t.employee.id}`, { method: "DELETE" }); setMsg("Face data deleted"); load(); }}>Withdraw & delete</Button>}</div></Card>
    <Card><div className="mb-2 flex items-center"><h2 className="mr-auto font-bold">This month</h2><Button variant="outline" onClick={() => setForm({ workDate: "", reason: "", status: "", inT: "", outT: "" })}>Request correction</Button></div>
      <table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-1">Date</th><th>In</th><th>Out</th><th>Hours</th><th>Status</th><th>Via</th></tr></thead>
        <tbody>{hist.map(h => <tr key={h.id} className="border-t border-brand-border"><td className="py-1">{h.workDate.slice(0, 10)}</td><td>{tm(h.checkInAt)}</td><td>{tm(h.checkOutAt)}</td><td>{h.workMinutes != null ? (h.workMinutes / 60).toFixed(1) : "—"}</td><td>{h.status}</td><td>{h.method}</td></tr>)}</tbody></table>
      {!hist.length && <p className="py-6 text-center text-sm text-brand-muted">No attendance yet this month.</p>}</Card>
    {!!corr.length && <Card><h2 className="mb-2 font-bold">My correction requests</h2>{corr.map(c => <p key={c.id} className="border-t border-brand-border py-1 text-sm">{c.workDate.slice(0, 10)} · {c.reason} · <b>{c.status}</b></p>)}</Card>}
    {cap && <Modal title={cap.kind === "ENROLL" ? "Register your face" : cap.kind === "FACE" ? "Face verification" : "Take a selfie"} onClose={() => setCap(null)}>
      {cap.kind === "SELFIE" ? <SelfieCapture onCancel={() => setCap(null)} onResult={s => selfieDone(cap.type, s)} /> : <FaceCapture onCancel={() => setCap(null)} onResult={r => cap.kind === "ENROLL" ? enrollDone(r) : faceDone(cap.type, r)} />}</Modal>}
    {form && <Modal title="Attendance correction" onClose={() => setForm(null)}><div className="space-y-3"><Field label="Date"><input type="date" className={inp} value={form.workDate} onChange={e => setForm({ ...form, workDate: e.target.value })} /></Field>
      <div className="grid grid-cols-3 gap-2"><Field label="Status"><select className={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="">—</option><option>PRESENT</option><option>HALF_DAY</option></select></Field>
        <Field label="In time"><input type="time" className={inp} value={form.inT} onChange={e => setForm({ ...form, inT: e.target.value })} /></Field><Field label="Out time"><input type="time" className={inp} value={form.outT} onChange={e => setForm({ ...form, outT: e.target.value })} /></Field></div>
      <Field label="Reason"><input className={inp} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></Field><Button onClick={submitCorr} disabled={!form.workDate || form.reason.length < 5}>Submit</Button></div></Modal>}
  </>);
}
