"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { Field, Modal, inp } from "@/components/ui/modal";
import { can, useMe } from "@/components/me";
import { api, download } from "@/lib/api";
import { parseCsv } from "@/lib/csv";

const schema = z.object({ fullName: z.string().min(2, "Required"), email: z.string().email("Invalid").or(z.literal("")), mobile: z.string().regex(/^[0-9+\- ]{7,15}$/, "Invalid").or(z.literal("")),
  dob: z.string(), gender: z.string(), joiningDate: z.string().min(1, "Required"), employmentType: z.string(), designationId: z.string(), departmentId: z.string(), branchId: z.string(),
  address: z.string(), emergencyContact: z.string(), bankName: z.string(), accountNumber: z.string(), ifsc: z.string(), createLogin: z.boolean().optional() });
type F = z.infer<typeof schema>;
const blank: F = { fullName: "", email: "", mobile: "", dob: "", gender: "", joiningDate: "", employmentType: "FULL_TIME", designationId: "", departmentId: "", branchId: "", address: "", emergencyContact: "", bankName: "", accountNumber: "", ifsc: "" };
const clean = (o: any) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined));

function EmpForm({ emp, lists, onDone }: { emp?: any; lists: any; onDone: (msg?: string) => void }) {
  const init = emp ? { ...blank, ...Object.fromEntries(Object.keys(blank).map(k => [k, emp[k] ?? emp.bank?.[k] ?? ""])), dob: emp.dob?.slice(0, 10) ?? "", joiningDate: emp.joiningDate?.slice(0, 10) } : blank;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema), defaultValues: init });
  const [err, setErr] = useState("");
  const save = async (d: F) => {
    try {
      const body: any = clean(d); if (emp) { delete body.branchId; delete body.createLogin; }
      const r = await api<any>(emp ? `/employees/${emp.id}` : "/employees", { method: emp ? "PATCH" : "POST", body: JSON.stringify(body) });
      onDone(r.tempPassword ? `Employee created. Login password (shown once): ${r.tempPassword}` : "Saved");
    } catch (e: any) { setErr(String(e.message)); }
  };
  const sel = (n: keyof F, items: any[]) => <select className={inp} {...register(n as any)}><option value="">—</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>;
  return (<form onSubmit={handleSubmit(save)} className="grid gap-3 md:grid-cols-2">
    <Field label="Full name *" error={errors.fullName?.message}><input className={inp} {...register("fullName")} /></Field>
    <Field label="Email" error={errors.email?.message}><input className={inp} {...register("email")} /></Field>
    <Field label="Mobile" error={errors.mobile?.message}><input className={inp} {...register("mobile")} /></Field>
    <Field label="Date of birth"><input type="date" className={inp} {...register("dob")} /></Field>
    <Field label="Gender"><select className={inp} {...register("gender")}><option value="">—</option><option>MALE</option><option>FEMALE</option><option>OTHER</option></select></Field>
    <Field label="Joining date *" error={errors.joiningDate?.message}><input type="date" className={inp} {...register("joiningDate")} /></Field>
    <Field label="Employment type"><select className={inp} {...register("employmentType")}>{["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"].map(t => <option key={t}>{t}</option>)}</select></Field>
    <Field label="Designation">{sel("designationId", lists.designations)}</Field><Field label="Department">{sel("departmentId", lists.departments)}</Field>
    {!emp && <Field label="Branch">{sel("branchId", lists.branches)}</Field>}
    <Field label="Emergency contact"><input className={inp} {...register("emergencyContact")} /></Field><Field label="Address"><input className={inp} {...register("address")} /></Field>
    <Field label="Bank name"><input className={inp} {...register("bankName")} /></Field><Field label="Account number"><input className={inp} {...register("accountNumber")} /></Field><Field label="IFSC"><input className={inp} {...register("ifsc")} /></Field>
    {!emp && <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" {...register("createLogin")} />Create employee portal login (needs email)</label>}
    {err && <p className="text-sm text-brand-red md:col-span-2">{err}</p>}
    <div className="md:col-span-2"><Button disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save"}</Button></div></form>);
}

export default function Employees() {
  const me = useMe(); const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<any>(null); const [lists, setLists] = useState<any>({ branches: [], departments: [], designations: [] });
  const [q, setQ] = useState(""); const [page, setPage] = useState(1); const [branchId, setBranchId] = useState(""); const [deptId, setDeptId] = useState(""); const [sort, setSort] = useState("createdAt");
  const [modal, setModal] = useState<any>(null); const [msg, setMsg] = useState("");
  const load = useCallback(() => { const p = new URLSearchParams({ page: String(page), pageSize: "15", sort, ...(q && { q }), ...(branchId && { branchId }), ...(deptId && { departmentId: deptId }) });
    api<any>("/employees?" + p).then(setData).catch(e => setMsg(e.message)); }, [page, q, branchId, deptId, sort]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { Promise.all([api<any[]>("/branches"), api<any[]>("/departments"), api<any[]>("/designations")]).then(([branches, departments, designations]) => setLists({ branches, departments, designations })).catch(() => {}); }, []);
  const done = (m?: string) => { setModal(null); if (m) setMsg(m); load(); };
  const archive = async (e: any) => { if (confirm(`Archive ${e.fullName}? Their login will be disabled.`)) { await api(`/employees/${e.id}/archive`, { method: "POST" }); load(); } };
  const doImport = async (f: File) => { try { const rows = parseCsv(await f.text()); const r = await api<any>("/employees/import", { method: "POST", body: JSON.stringify({ rows }) });
    setMsg(`Imported ${r.created}. ${r.errors.length ? "Errors: " + r.errors.slice(0, 5).map((x: any) => `row ${x.row}: ${x.message}`).join("; ") : ""}`); load(); } catch (e: any) { setMsg(e.message); } };
  const pages = data ? Math.ceil(data.total / data.pageSize) : 1;
  return (<div className="space-y-4"><div className="flex flex-wrap items-center gap-2"><h1 className="mr-auto text-2xl font-bold">Employees</h1>
    {can(me, "employee:export") && <Button variant="outline" onClick={() => download("/employees/export", "employees.csv")}>Export CSV</Button>}
    {can(me, "employee:create") && <><input ref={fileRef} type="file" accept=".csv" hidden onChange={e => e.target.files?.[0] && doImport(e.target.files[0])} />
      <Button variant="outline" onClick={() => fileRef.current?.click()}>Import CSV</Button><Button onClick={() => setModal({ type: "form" })}>Add employee</Button></>}</div>
    {msg && <p className="rounded-lg bg-white p-3 text-sm shadow-card">{msg}</p>}
    <p className="text-xs text-brand-muted">CSV columns: fullName, email, mobile, dob, gender, joiningDate (YYYY-MM-DD), employmentType, branch, department, designation</p>
    <Card><div className="mb-3 flex flex-wrap gap-2"><input className={inp + " max-w-xs"} placeholder="Search name, ID, email, mobile" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
      <select className={inp + " max-w-[10rem]"} value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }}><option value="">All branches</option>{lists.branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <select className={inp + " max-w-[10rem]"} value={deptId} onChange={e => { setDeptId(e.target.value); setPage(1); }}><option value="">All departments</option>{lists.departments.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <select className={inp + " max-w-[10rem]"} value={sort} onChange={e => setSort(e.target.value)}><option value="createdAt">Newest</option><option value="fullName">Name</option><option value="employeeCode">ID</option><option value="joiningDate">Joining date</option></select></div>
      {!data ? <Skeleton /> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr><th className="py-2">ID</th><th>Name</th><th>Designation</th><th>Department</th><th>Branch</th><th>Joined</th><th /></tr></thead>
        <tbody>{data.items.map((e: any) => <tr key={e.id} className="border-t border-brand-border"><td className="py-2">{e.employeeCode}</td><td className="font-semibold">{e.fullName}<div className="text-xs font-normal text-brand-muted">{e.email}</div></td>
          <td>{e.designation?.name ?? "—"}</td><td>{e.department?.name ?? "—"}</td><td>{e.branch?.name ?? "—"}</td><td>{e.joiningDate.slice(0, 10)}</td>
          <td className="space-x-2 whitespace-nowrap text-right">{can(me, "employee:edit") && <button className="font-semibold hover:text-brand-red" onClick={() => setModal({ type: "form", emp: e })}>Edit</button>}
            {can(me, "employee:manage") && <button className="font-semibold hover:text-brand-red" onClick={() => setModal({ type: "transfer", emp: e })}>Transfer</button>}
            {can(me, "employee:delete") && <button className="font-semibold text-brand-red" onClick={() => archive(e)}>Archive</button>}</td></tr>)}</tbody></table>
        {!data.items.length && <p className="py-10 text-center text-brand-muted">No employees found.</p>}</div>}
      <div className="mt-3 flex items-center justify-between text-sm"><span className="text-brand-muted">{data?.total ?? 0} total</span><div className="space-x-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button><span>{page}/{pages || 1}</span><Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button></div></div></Card>
    {modal?.type === "form" && <Modal title={modal.emp ? "Edit employee" : "Add employee"} onClose={() => setModal(null)}><EmpForm emp={modal.emp} lists={lists} onDone={done} /></Modal>}
    {modal?.type === "transfer" && <Transfer emp={modal.emp} lists={lists} onClose={() => setModal(null)} onDone={done} />}</div>);
}
function Transfer({ emp, lists, onClose, onDone }: any) {
  const [b, setB] = useState(""), [d, setD] = useState(""), [err, setErr] = useState("");
  const go = async () => { try { await api(`/employees/${emp.id}/transfer`, { method: "POST", body: JSON.stringify(clean({ branchId: b, departmentId: d })) }); onDone("Transferred"); } catch (e: any) { setErr(e.message); } };
  return (<Modal title={`Transfer ${emp.fullName}`} onClose={onClose}><div className="space-y-3"><Field label="New branch"><select className={inp} value={b} onChange={e => setB(e.target.value)}><option value="">(no change)</option>{lists.branches.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
    <Field label="New department"><select className={inp} value={d} onChange={e => setD(e.target.value)}><option value="">(no change)</option>{lists.departments.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
    {err && <p className="text-sm text-brand-red">{err}</p>}<Button onClick={go} disabled={!b && !d}>Transfer</Button></div></Modal>);
}
