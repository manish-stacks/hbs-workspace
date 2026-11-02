"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Modal, inp } from "@/components/ui/modal";
import { can, useMe } from "@/components/me";
import { api } from "@/lib/api";
export default function Branches() {
  const me = useMe(); const [rows, setRows] = useState<any[] | null>(null); const [m, setM] = useState<any>(null); const [err, setErr] = useState("");
  const load = () => api<any[]>("/branches").then(setRows).catch(e => setErr(e.message)); useEffect(() => { load(); }, []);
  const save = async () => { try { m.id ? await api(`/branches/${m.id}`, { method: "PATCH", body: JSON.stringify({ name: m.name, address: m.address || undefined }) })
    : await api("/branches", { method: "POST", body: JSON.stringify({ name: m.name, code: m.code, address: m.address || undefined }) }); setM(null); setErr(""); load(); } catch (e: any) { setErr(String(e.message)); } };
  const del = async (b: any) => { if (confirm(`Delete ${b.name}?`)) try { await api(`/branches/${b.id}`, { method: "DELETE" }); load(); } catch (e: any) { setErr(e.message); } };
  return (<div className="space-y-4"><div className="flex items-center"><h1 className="mr-auto text-2xl font-bold">Branches</h1>{can(me, "branch:create") && <Button onClick={() => setM({ name: "", code: "", address: "" })}>Add branch</Button>}</div>
    {err && <p className="text-sm text-brand-red">{err}</p>}
    <Card><table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">Name</th><th>Code</th><th>Address</th><th /></tr></thead>
      <tbody>{rows?.map(b => <tr key={b.id} className="border-t border-brand-border"><td className="py-2 font-semibold">{b.name}</td><td>{b.code}</td><td>{b.address ?? "—"}</td>
        <td className="space-x-2 text-right">{can(me, "branch:edit") && <button className="font-semibold" onClick={() => setM(b)}>Edit</button>}{can(me, "branch:delete") && <button className="font-semibold text-brand-red" onClick={() => del(b)}>Delete</button>}</td></tr>)}</tbody></table>
      {rows && !rows.length && <p className="py-10 text-center text-brand-muted">No branches yet. Add your first branch.</p>}</Card>
    {m && <Modal title={m.id ? "Edit branch" : "Add branch"} onClose={() => setM(null)}><div className="space-y-3">
      <Field label="Name"><input className={inp} value={m.name} onChange={e => setM({ ...m, name: e.target.value })} /></Field>
      {!m.id && <Field label="Code (unique)"><input className={inp} value={m.code} onChange={e => setM({ ...m, code: e.target.value })} /></Field>}
      <Field label="Address"><input className={inp} value={m.address ?? ""} onChange={e => setM({ ...m, address: e.target.value })} /></Field><Button onClick={save}>Save</Button></div></Modal>}</div>);
}
