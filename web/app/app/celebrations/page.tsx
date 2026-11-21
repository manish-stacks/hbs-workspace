"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { Field, inp } from "@/components/ui/modal";
import { CelebCard } from "@/components/celebration-cards";
import { can, useMe } from "@/components/me";
import { api } from "@/lib/api";
export default function Celebrations() {
  const me = useMe(); const [days, setDays] = useState(30); const [d, setD] = useState<any>(null); const [cfg, setCfg] = useState<any>(null); const [tpl, setTpl] = useState<any>(null); const [hist, setHist] = useState<any[]>([]); const [msg, setMsg] = useState("");
  const load = useCallback(() => { api<any>(`/celebrations/upcoming?days=${days}`).then(setD); }, [days]); useEffect(load, [load]);
  const manage = can(me, "celebration:manage");
  const loadAdmin = useCallback(() => { api<any>("/celebrations/settings").then(setCfg).catch(() => {}); api<any>("/celebrations/templates").then(setTpl).catch(() => {}); api<any[]>("/celebrations/history").then(setHist).catch(() => {}); }, []); useEffect(loadAdmin, [loadAdmin]);
  const run = async () => { try { const r = await api<any>("/celebrations/run", { method: "POST" }); setMsg(`Done: ${r.birthdays} birthday and ${r.anniversaries} anniversary wishes sent (already-sent ones are skipped).`); load(); loadAdmin(); } catch (e: any) { setMsg(String(e.message)); } };
  const saveCfg = async () => { try { await api("/celebrations/settings", { method: "PUT", body: JSON.stringify({ ...cfg, hour: +cfg.hour, milestones: String(cfg.milestonesText ?? cfg.milestones.join(",")).split(",").map((x: string) => +x.trim()).filter(Boolean) }) }); setMsg("Settings saved"); } catch (e: any) { setMsg(String(e.message)); } };
  const saveTpl = async (kind: string) => { try { await api("/celebrations/templates", { method: "PUT", body: JSON.stringify({ kind, subject: tpl[kind].subject, body: tpl[kind].body }) }); setMsg("Template saved"); } catch (e: any) { setMsg(String(e.message)); } };
  const toggle = (k: string, l: string) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!manage} checked={cfg[k]} onChange={e => setCfg({ ...cfg, [k]: e.target.checked })} />{l}</label>;
  const List = ({ rows, kind }: any) => rows.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((p: any) => <CelebCard key={p.id} p={p} kind={kind} />)}</div> : <p className="py-4 text-sm text-brand-muted">None in this period.</p>;
  return (<div className="space-y-4"><div className="flex items-center gap-2"><h1 className="mr-auto text-2xl font-bold">Celebrations</h1><select className={inp + " max-w-[9rem]"} value={days} onChange={e => setDays(+e.target.value)}>{[7, 30, 90].map(n => <option key={n} value={n}>Next {n} days</option>)}</select>{manage && <Button variant="outline" onClick={run}>Run now</Button>}</div>
    {msg && <p className="rounded-lg bg-white p-3 text-sm shadow-card">{msg}</p>}
    {!d ? <Skeleton /> : <><Card><h2 className="mb-2 font-bold">Birthdays</h2><List rows={d.birthdays} kind="BIRTHDAY" /></Card><Card><h2 className="mb-2 font-bold">Work anniversaries</h2><List rows={d.anniversaries} kind="ANNIVERSARY" /></Card></>}
    {cfg && <Card><h2 className="mb-3 font-bold">Automation settings</h2><div className="grid gap-2 md:grid-cols-3">{toggle("birthdayEnabled", "Birthday wishes")}{toggle("anniversaryEnabled", "Anniversary wishes")}{toggle("inApp", "In-app notifications")}{toggle("email", "Email (needs SMTP)")}{toggle("announceToCompany", "Announce to all colleagues")}</div>
      <div className="mt-3 grid gap-3 md:grid-cols-3"><Field label="Send after hour (company time, 0–23)"><input type="number" disabled={!manage} className={inp} value={cfg.hour} onChange={e => setCfg({ ...cfg, hour: e.target.value })} /></Field>
        <Field label="Anniversary milestones (years, comma-separated; blank = every year)"><input disabled={!manage} className={inp} value={cfg.milestonesText ?? cfg.milestones.join(", ")} onChange={e => setCfg({ ...cfg, milestonesText: e.target.value })} /></Field></div>
      {manage && <Button className="mt-3" onClick={saveCfg}>Save settings</Button>}<p className="mt-2 text-xs text-brand-muted">A background job checks hourly (needs Redis). Each employee gets each wish once per year.</p></Card>}
    {tpl && manage && ["BIRTHDAY", "ANNIVERSARY"].map(k => <Card key={k}><h2 className="mb-2 font-bold">{k === "BIRTHDAY" ? "Birthday" : "Anniversary"} template</h2><p className="mb-2 text-xs text-brand-muted">Placeholders: {"{{name}} {{years}} {{company}}"}</p>
      <Field label="Subject"><input className={inp} value={tpl[k].subject} onChange={e => setTpl({ ...tpl, [k]: { ...tpl[k], subject: e.target.value } })} /></Field><div className="mt-2"><Field label="Message"><textarea className={inp + " h-28"} value={tpl[k].body} onChange={e => setTpl({ ...tpl, [k]: { ...tpl[k], body: e.target.value } })} /></Field></div><Button className="mt-2" onClick={() => saveTpl(k)}>Save template</Button></Card>)}
    {can(me, "celebration:view") && <Card><h2 className="mb-2 font-bold">Delivery history</h2>{hist.map(h => <div key={h.id} className="border-t border-brand-border py-1.5 text-sm"><b>{h.employee.fullName}</b> · {h.kind === "BIRTHDAY" ? "Birthday" : `${h.years}-yr anniversary`} · {new Date(h.createdAt).toLocaleDateString()}
      <span className="ml-2 text-xs text-brand-muted">{h.logs.map((l: any) => `${l.channel}: ${l.status}${l.status === "FAILED" || l.status === "SKIPPED" ? ` (${l.detail})` : ""}`).join(" · ")}</span></div>)}{!hist.length && <p className="py-4 text-center text-sm text-brand-muted">No wishes sent yet.</p>}</Card>}</div>);
}
