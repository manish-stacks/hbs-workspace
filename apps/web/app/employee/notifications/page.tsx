"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CelebCard } from "@/components/celebration-cards";
import { api } from "@/lib/api";
export default function Notifs() {
  const [n, setN] = useState<any>({ items: [], unread: 0 }); const [c, setC] = useState<any>(null);
  const load = () => api<any>("/notifications").then(setN).catch(() => {}); useEffect(() => { load(); api<any>("/celebrations/upcoming?days=14").then(setC).catch(() => {}); }, []);
  return (<><div className="flex items-center"><h1 className="mr-auto text-2xl font-bold">Notifications</h1><Button variant="outline" onClick={async () => { await api("/notifications/read", { method: "POST", body: JSON.stringify({}) }); load(); }}>Mark all read</Button></div>
    {c && (c.birthdays.length > 0 || c.anniversaries.length > 0) && <Card><h2 className="mb-2 font-bold">Celebrations (next 14 days)</h2><div className="grid gap-3 sm:grid-cols-2">{c.birthdays.map((p: any) => <CelebCard key={"b" + p.id} p={p} kind="BIRTHDAY" />)}{c.anniversaries.map((p: any) => <CelebCard key={"a" + p.id} p={p} kind="ANNIVERSARY" />)}</div></Card>}
    <Card>{n.items.map((x: any) => <div key={x.id} className={`border-t border-brand-border py-2 text-sm first:border-0 ${x.readAt ? "text-brand-muted" : ""}`}><b>{x.title}</b>{!x.readAt && <span className="ml-2 rounded-full bg-brand-red px-1.5 text-[10px] text-white">new</span>}<p className="whitespace-pre-line">{x.body}</p><p className="text-xs text-brand-muted">{new Date(x.createdAt).toLocaleString()}</p></div>)}{!n.items.length && <p className="py-8 text-center text-brand-muted">You're all caught up.</p>}</Card></>);
}
