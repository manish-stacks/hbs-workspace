"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Modal, inp } from "@/components/ui/modal";
import { can, useMe } from "@/components/me";
import { api } from "@/lib/api";
export default function Settings() {
  const me = useMe(); const [co, setCo] = useState<any>(null); const [roles, setRoles] = useState<any[]>([]); const [perms, setPerms] = useState<string[]>([]); const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]); const [depts, setDepts] = useState<any[]>([]); const [msg, setMsg] = useState(""); const [role, setRole] = useState<any>(null);
  const load = () => { api("/company").then(setCo).catch(() => {});
    if (can(me, "role:view")) { api<any[]>("/roles").then(setRoles); api<string[]>("/permissions").then(setPerms); api<any[]>("/users").then(setUsers); api<any[]>("/branches").then(setBranches).catch(() => {}); api<any[]>("/departments").then(setDepts).catch(() => {}); } };
  useEffect(load, []); // eslint-disable-line
  const wrap = async (f: () => Promise<any>, ok: string) => { try { await f(); setMsg(ok); load(); } catch (e: any) { setMsg(String(e.message)); } };
  const mods = [...new Set(perms.map(p => p.split(":")[0]))], acts = [...new Set(perms.map(p => p.split(":")[1]))];
  const saveRole = () => wrap(async () => { const body = JSON.stringify({ name: role.name, permissions: role.permissions }); await api(role.id ? `/roles/${role.id}` : "/roles", { method: role.id ? "PATCH" : "POST", body }); setRole(null); }, "Role saved");
  const setAccess = (u: any, patch: any) => wrap(() => api(`/users/${u.id}/access`, { method: "PUT", body: JSON.stringify({ roleIds: u.roleIds, branchId: u.branchId || undefined, departmentId: u.departmentId || undefined, ...patch }) }), "Access updated");
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Settings</h1>{msg && <p className="rounded-lg bg-white p-3 text-sm shadow-card">{msg}</p>}
    {co && <Card><h2 className="mb-3 font-bold">Company profile</h2><div className="grid gap-3 md:grid-cols-2">
      {(["name", "gstin", "phone", "address", "timezone"] as const).map(k => <Field key={k} label={k}><input className={inp} disabled={!can(me, "company:edit")} value={co[k] ?? ""} onChange={e => setCo({ ...co, [k]: e.target.value })} /></Field>)}</div>
      {can(me, "company:edit") && <Button className="mt-3" onClick={() => wrap(() => api("/company", { method: "PATCH", body: JSON.stringify({ name: co.name, gstin: co.gstin || undefined, phone: co.phone || undefined, address: co.address || undefined, timezone: co.timezone }) }), "Company saved")}>Save</Button>}</Card>}
    {can(me, "role:view") && <Card><div className="mb-3 flex items-center"><h2 className="mr-auto font-bold">Roles</h2>{can(me, "role:create") && <Button onClick={() => setRole({ name: "", permissions: [] })}>New custom role</Button>}</div>
      {roles.map(r => <div key={r.id} className="flex items-center justify-between border-t border-brand-border py-2 text-sm"><span><b>{r.name}</b> <span className="text-brand-muted">{r.isSystem ? "system" : "custom"} · {r.permissions.length} permissions</span></span>
        {!r.isSystem && <span className="space-x-3">{can(me, "role:edit") && <button className="font-semibold" onClick={() => setRole(r)}>Edit</button>}{can(me, "role:delete") && <button className="font-semibold text-brand-red" onClick={() => confirm("Delete role?") && wrap(() => api(`/roles/${r.id}`, { method: "DELETE" }), "Role deleted")}>Delete</button>}</span>}</div>)}</Card>}
    {can(me, "role:view") && <Card><h2 className="mb-3 font-bold">Users & access</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">User</th><th>Role</th><th>Branch restriction</th><th>Department restriction</th></tr></thead>
      <tbody>{users.map(u => <tr key={u.id} className="border-t border-brand-border"><td className="py-2">{u.name}<div className="text-xs text-brand-muted">{u.email}</div></td>
        <td><select className={inp} disabled={!can(me, "role:manage")} value={u.roleIds[0] ?? ""} onChange={e => setAccess(u, { roleIds: [e.target.value] })}>{!u.roleIds.length && <option value="">—</option>}{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></td>
        <td><select className={inp} disabled={!can(me, "role:manage")} value={u.branchId ?? ""} onChange={e => setAccess(u, { branchId: e.target.value || undefined })}><option value="">All</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td>
        <td><select className={inp} disabled={!can(me, "role:manage")} value={u.departmentId ?? ""} onChange={e => setAccess(u, { departmentId: e.target.value || undefined })}><option value="">All</option>{depts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td></tr>)}</tbody></table></div></Card>}
    {role && <Modal title={role.id ? "Edit role" : "New role"} onClose={() => setRole(null)}><div className="space-y-3"><Field label="Role name"><input className={inp} value={role.name} onChange={e => setRole({ ...role, name: e.target.value })} /></Field>
      <div className="overflow-x-auto"><table className="text-xs"><thead><tr><th />{acts.map(a => <th key={a} className="px-2 capitalize">{a}</th>)}</tr></thead>
        <tbody>{mods.map(m => <tr key={m}><td className="pr-2 font-semibold capitalize">{m}</td>{acts.map(a => { const c = `${m}:${a}`; return <td key={a} className="text-center"><input type="checkbox" disabled={!me.perms.includes(c)} checked={role.permissions.includes(c)}
          onChange={e => setRole({ ...role, permissions: e.target.checked ? [...role.permissions, c] : role.permissions.filter((x: string) => x !== c) })} /></td>; })}</tr>)}</tbody></table></div>
      <p className="text-xs text-brand-muted">You can only grant permissions you hold yourself.</p><Button onClick={saveRole} disabled={role.name.length < 2}>Save role</Button></div></Modal>}</div>);
}
