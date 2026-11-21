"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
export type Me = { id: string; name: string; tenantId: string | null; isSuperAdmin: boolean; roles: string[]; perms: string[]; impersonatedBy: string | null };
const Ctx = createContext<Me | null>(null);
export const useMe = () => useContext(Ctx)!;
export const can = (m: Me, p: string) => !p || m.isSuperAdmin || m.roles.some(r => /owner|admin/i.test(r)) || m.perms.includes(p);
export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => { api<Me>("/auth/me").then(m => (m.tenantId ? setMe(m) : (location.href = "/super-admin/dashboard"))).catch(() => (location.href = "/login")); }, []);
  return me ? <Ctx.Provider value={me}>{children}</Ctx.Provider> : null;
}
