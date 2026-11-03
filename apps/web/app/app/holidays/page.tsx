"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inp } from "@/components/ui/modal";
import { can, useMe } from "@/components/me";
import { api } from "@/lib/api";
export default function Holidays() {
  const me = useMe(); const [year, setYear] = useState(new Date().getFullYear()); const [rows, setRows] = useState<any[] | null>(null); const [msg, setMsg] = useState("");
  const [f, setF] = useState<any>({ name: "", date: "", type: "COMPANY", branchId: "", departmentId: "" }); const [lists, setLists] = useState<any>({ b: [], d: [] });
  const load = useCallback(() => { api<any[]>(`/holidays?year=${year}`).then(setRows); }, [year]); useEffect(load, [load]);
  useEffect(() => { Promise.all([api<any[]>("/branches"), api<any[]>("/departments")]).then(([b, d]) => setLists({ b, d })).catch(() => {}); }, []);
  const add = async () => { try { await api("/holidays", { method: "POST", body: JSON.stringify(Object.fromEntries(Object.entries(f).filter(([, v]) => v))) }); setF({ ...f, name: "", date: "" }); load(); } catch (e: any) { setMsg(String(e.message)); } };
  const del = async (id: string) => { if (confirm("Delete holiday?")) { await api(`/holidays/${id}`, { method: "DELETE" }); load(); } };
  const nm = (arr: any[], id?: string) => arr.find(x => x.id === id)?.name;
  return (<div className="space-y-4"><div className="flex items-center gap-3"><h1 className="mr-auto text-2xl font-bold">Holidays</h1><select className={inp + " max-w-[7rem]"} value={year} onChange={e => setYear(+e.target.value)}>{[-1, 0, 1].map(o => <option key={o}>{new Date().getFullYear() + o}</option>)}</select></div>
    {msg && <p className="text-sm text-brand-red">{msg}</p>}
    {can(me, "shift:create") && <Card><div className="grid gap-3 md:grid-cols-6"><Field label="Name"><input className={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field><Field label="Date"><input type="date" className={inp} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
      <Field label="Type"><select className={inp} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="COMPANY">Company</option><option value="OPTIONAL">Optional</option></select></Field>
      <Field label="Branch"><select className={inp} value={f.branchId} onChange={e => setF({ ...f, branchId: e.target.value })}><option value="">All</option>{lists.b.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Department"><select className={inp} value={f.departmentId} onChange={e => setF({ ...f, departmentId: e.target.value })}><option value="">All</option>{lists.d.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <div className="flex items-end"><Button disabled={!f.name || !f.date} onClick={add}>Add</Button></div></div></Card>}
    <Card><table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">Date</th><th>Holiday</th><th>Type</th><th>Applies to</th><th /></tr></thead>
      <tbody>{rows?.map(h => <tr key={h.id} className="border-t border-brand-border"><td className="py-2">{new Date(h.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</td><td className="font-semibold">{h.name}</td><td>{h.type}</td>
        <td>{[nm(lists.b, h.branchId), nm(lists.d, h.departmentId)].filter(Boolean).join(" · ") || "Everyone"}</td><td className="text-right">{can(me, "shift:delete") && <button className="text-brand-red" onClick={() => del(h.id)}>Delete</button>}</td></tr>)}</tbody></table>
      {rows && !rows.length && <p className="py-8 text-center text-brand-muted">No holidays for {year}.</p>}<p className="mt-2 text-xs text-brand-muted">Optional holidays are listed for reference and do not auto-mark attendance.</p></Card></div>);
}
