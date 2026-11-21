"use client";

import { useEffect, useState } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

export function AttendanceTrendChart({ data }: { data: any[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-64 w-full animate-pulse rounded-xl bg-neutral-100" />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis dataKey="day" tickLine={false} stroke="#737373" fontSize={11} />
          <YAxis tickLine={false} stroke="#737373" fontSize={11} />
          <Tooltip 
            contentStyle={{ backgroundColor: "#171717", color: "#fff", borderRadius: 8, fontSize: 12, border: "none" }} 
          />
          <Area type="monotone" dataKey="present" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPresent)" name="Present" />
          <Area type="monotone" dataKey="onLeave" stroke="#3B82F6" strokeWidth={2} fillOpacity={0} name="On Leave" />
          <Area type="monotone" dataKey="absent" stroke="#EF4444" strokeWidth={1.5} fillOpacity={0} name="Absent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlatformRevenueChart({ data }: { data: any[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-64 w-full animate-pulse rounded-xl bg-neutral-100" />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F21B2B" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#F21B2B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis dataKey="month" tickLine={false} stroke="#737373" fontSize={11} />
          <YAxis tickLine={false} stroke="#737373" fontSize={11} />
          <Tooltip 
            contentStyle={{ backgroundColor: "#171717", color: "#fff", borderRadius: 8, fontSize: 12, border: "none" }} 
          />
          <Area type="monotone" dataKey="mrr" stroke="#F21B2B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMrr)" name="MRR (₹)" />
          <Area type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" name="Workforce" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
