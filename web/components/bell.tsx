"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
export function Bell({ allHref }: { allHref: string }) {
  const [d, setD] = useState<any>({ items: [], unread: 0 }); const [open, setOpen] = useState(false);
  const load = useCallback(() => { api<any>("/notifications").then(setD).catch(() => {}); }, []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);   // live push (Socket.IO) is a later upgrade
  const readAll = async () => { await api("/notifications/read", { method: "POST", body: JSON.stringify({}) }); load(); };
  return (<div className="relative"><button aria-label="Notifications" onClick={() => setOpen(!open)} className="relative text-xl">🔔{d.unread > 0 && <span className="absolute -right-2 -top-1 rounded-full bg-brand-red px-1.5 text-[10px] font-bold text-white">{d.unread}</span>}</button>
    {open && <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-brand-border bg-white p-2 shadow-xl"><div className="flex justify-between px-2 py-1 text-xs"><button className="font-semibold" onClick={readAll}>Mark all read</button><Link href={allHref} className="font-semibold text-brand-red" onClick={() => setOpen(false)}>See all</Link></div>
      <div className="max-h-80 overflow-auto">{d.items.slice(0, 8).map((n: any) => <div key={n.id} className={`border-t border-brand-border px-2 py-2 text-sm ${n.readAt ? "text-brand-muted" : ""}`}><b>{n.title}</b><p className="line-clamp-2 text-xs">{n.body}</p></div>)}{!d.items.length && <p className="p-4 text-center text-sm text-brand-muted">No notifications</p>}</div></div>}</div>);
}
