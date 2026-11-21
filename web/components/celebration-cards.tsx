"use client";
const fmt = (s: string) => new Date(s + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
export function CelebCard({ p, kind }: { p: any; kind: "BIRTHDAY" | "ANNIVERSARY" }) {
  return (<div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-brand-black to-[#3a0b10] p-4 text-white shadow-card">
    {p.photoUrl ? <img src={p.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-red text-lg font-bold">{p.name[0]}</div>}
    <div className="min-w-0"><p className="truncate font-bold">{p.name}</p><p className="text-xs text-white/80">{kind === "BIRTHDAY" ? "🎂 Birthday" : `🎉 ${p.years} year${p.years > 1 ? "s" : ""} with us`} · {p.daysAway === 0 ? "Today" : p.daysAway === 1 ? "Tomorrow" : fmt(p.date)}</p></div></div>);
}
