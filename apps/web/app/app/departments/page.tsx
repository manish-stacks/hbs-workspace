"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inp } from "@/components/ui/modal";
import { can, useMe } from "@/components/me";
import { api } from "@/lib/api";
function NameList({ title, path, add, del }: { title: string; path: string; add: string; del: string }) {
  const me = useMe(); const [rows, setRows] = useState<any[] | null>(null); const [name, setName] = useState(""); const [err, setErr] = useState("");
  const load = () => api<any[]>(path).then(setRows).catch(e => setErr(e.message)); useEffect(() => { load(); }, []);
  const submit = async () => { try { await api(path, { method: "POST", body: JSON.stringify({ name }) }); setName(""); setErr(""); load(); } catch (e: any) { setErr(String(e.message)); } };
  const remove = async (r: any) => { if (confirm(`Delete ${r.name}? Employees will be unassigned.`)) { await api(`${path}/${r.id}`, { method: "DELETE" }); load(); } };
  return (<Card><h2 className="mb-3 font-bold">{title}</h2>
    {can(me, add) && <div className="mb-3 flex gap-2"><input className={inp} placeholder="Name" value={name} onChange={e => setName(e.target.value)} /><Button onClick={submit} disabled={name.length < 2}>Add</Button></div>}
    {err && <p className="text-sm text-brand-red">{err}</p>}
    <ul>{rows?.map(r => <li key={r.id} className="flex justify-between border-t border-brand-border py-2 text-sm">{r.name}{can(me, del) && <button className="text-brand-red" onClick={() => remove(r)}>Delete</button>}</li>)}</ul>
    {rows && !rows.length && <p className="py-6 text-center text-sm text-brand-muted">Nothing here yet.</p>}</Card>);
}
export default function Departments() {
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Departments & Designations</h1><div className="grid gap-4 md:grid-cols-2">
    <NameList title="Departments" path="/departments" add="department:create" del="department:delete" /><NameList title="Designations" path="/designations" add="employee:create" del="employee:delete" /></div></div>);
}
