"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { Field, inp } from "@/components/ui/modal";
import { can, useMe } from "@/components/me";
import { api, download } from "@/lib/api";
export default function Reports() {
  const me = useMe(); const [cat, setCat] = useState<any[]>([]); const [key, setKey] = useState(""); const [lists, setLists] = useState<any>({ b: [], d: [] });
  const [p, setP] = useState<any>({ from: new Date(Date.now() - 30 * 864e5).toLocaleDateString("en-CA"), to: new Date().toLocaleDateString("en-CA"), date: new Date().toLocaleDateString("en-CA"), month: new Date().toLocaleDateString("en-CA").slice(0, 7), year: String(new Date().getFullYear()), branchId: "", departmentId: "" });
  const [r, setR] = useState<any>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { api<any[]>("/reports").then(c => { setCat(c); setKey(c[0]?.key ?? ""); }).catch(e => setErr(e.message)); Promise.all([api<any[]>("/branches"), api<any[]>("/departments")]).then(([b, d]) => setLists({ b, d })).catch(() => {}); }, []);
  const def = cat.find(c => c.key === key), qs = (fmt?: string) => new URLSearchParams(Object.fromEntries(Object.entries({ ...p, format: fmt }).filter(([, v]) => v)) as any).toString();
  const run = async () => { setBusy(true); setErr(""); try { setR(await api(`/reports/${key}?${qs()}`)); } catch (e: any) { setErr(String(e.message)); } setBusy(false); };
  const groups = [...new Set(cat.map(c => c.group))];
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Reports</h1>{err && <p className="text-sm text-brand-red">{err}</p>}
    <Card><div className="grid gap-3 md:grid-cols-4"><Field label="Report"><select className={inp} value={key} onChange={e => { setKey(e.target.value); setR(null); }}>{groups.map(g => <optgroup key={g} label={g}>{cat.filter(c => c.group === g).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</optgroup>)}</select></Field>
      {def?.params === "range" && <><Field label="From"><input type="date" className={inp} value={p.from} onChange={e => setP({ ...p, from: e.target.value })} /></Field><Field label="To"><input type="date" className={inp} value={p.to} onChange={e => setP({ ...p, to: e.target.value })} /></Field></>}
      {def?.params === "date" && <Field label="Date"><input type="date" className={inp} value={p.date} onChange={e => setP({ ...p, date: e.target.value })} /></Field>}
      {def?.params === "month" && <Field label="Month"><input type="month" className={inp} value={p.month} onChange={e => setP({ ...p, month: e.target.value })} /></Field>}
      {def?.params === "year" && <Field label="Year"><input type="number" className={inp} value={p.year} onChange={e => setP({ ...p, year: e.target.value })} /></Field>}
      <Field label="Branch"><select className={inp} value={p.branchId} onChange={e => setP({ ...p, branchId: e.target.value })}><option value="">All</option>{lists.b.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Department"><select className={inp} value={p.departmentId} onChange={e => setP({ ...p, departmentId: e.target.value })}><option value="">All</option>{lists.d.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field></div>
      <div className="mt-3 flex flex-wrap gap-2"><Button onClick={run} disabled={!key || busy}>{busy ? "Running…" : "Run report"}</Button>
        {can(me, "report:export") && <><Button variant="outline" disabled={!key} onClick={() => download(`/reports/${key}?${qs("csv")}`, `${key}.csv`).catch(e => setErr(e.message))}>Download CSV (Excel)</Button><Button variant="outline" disabled={!key} onClick={() => download(`/reports/${key}?${qs("pdf")}`, `${key}.pdf`).catch(e => setErr(e.message))}>Download PDF</Button></>}</div></Card>
    {busy && <Skeleton />}{r && <Card><h2 className="mb-2 font-bold">{r.title} <span className="text-sm font-normal text-brand-muted">· {r.total} rows{r.total > r.rows.length ? ` (showing ${r.rows.length}; download for all)` : ""}</span></h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-brand-muted"><tr>{r.columns.map((c: string) => <th key={c} className="whitespace-nowrap py-2 pr-3">{c}</th>)}</tr></thead><tbody>{r.rows.map((row: any[], i: number) => <tr key={i} className="border-t border-brand-border">{row.map((c, j) => <td key={j} className="whitespace-nowrap py-1.5 pr-3">{c ?? "—"}</td>)}</tr>)}</tbody></table></div>
      {!r.rows.length && <p className="py-8 text-center text-brand-muted">No data for these filters.</p>}</Card>}</div>);
}
