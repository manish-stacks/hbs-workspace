"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, download, inr } from "@/lib/api";
export default function Payslips() {
  const [rows, setRows] = useState<any[] | null>(null); const [msg, setMsg] = useState("");
  useEffect(() => { api<any[]>("/payroll/me/payslips").then(setRows).catch(e => setMsg(e.message)); }, []);
  return (<><h1 className="text-2xl font-bold">Payslips</h1>{msg && <p className="text-brand-red">{msg}</p>}
    <Card>{rows?.map(p => <div key={p.id} className="flex items-center justify-between border-t border-brand-border py-2 text-sm first:border-0"><span><b>{new Date(p.month + "-01T00:00:00Z").toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" })}</b><br /><span className="text-brand-muted">{p.number}</span></span>
      <span className="flex items-center gap-3"><b>{inr(p.net)}</b><Button variant="outline" onClick={() => download(`/payroll/payslips/${p.id}/pdf`, `${p.number}.pdf`).catch(e => setMsg(e.message))}>Download PDF</Button></span></div>)}
      {rows && !rows.length && <p className="py-8 text-center text-brand-muted">No payslips yet. They appear after payroll is locked.</p>}</Card></>);
}
