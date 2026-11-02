"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const schema = z.object({ companyName: z.string().optional(), name: z.string().optional(), email: z.string().email(), password: z.string().min(8, "Min 8 characters") });
type F = z.infer<typeof schema>;
const inp = "w-full rounded-lg border border-brand-border px-3 py-2.5 text-sm outline-none focus:border-brand-red";

export default function Login() {
  const [reg, setReg] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => setReg(location.search.includes("register")), []);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });
  const go = async (d: F) => {
    try {
      const t = await api<{ accessToken: string; refreshToken: string }>(reg ? "/auth/register-company" : "/auth/login", { method: "POST", body: JSON.stringify(d) });
      sessionStorage.setItem("at", t.accessToken); sessionStorage.setItem("rt", t.refreshToken);
      const me = await api<{ isSuperAdmin: boolean }>("/auth/me");
      location.href = me.isSuperAdmin ? "/super-admin/dashboard" : "/app/dashboard";
    } catch (e: any) { setMsg(e.message); }
  };
  return (<main className="grid min-h-screen place-items-center bg-brand-bg p-4">
    <form onSubmit={handleSubmit(go)} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-card">
      <div className="flex justify-center"><Logo h={56} /></div>
      <h2 className="text-center text-xl font-bold">{reg ? "Create your company" : "Sign in"}</h2>
      {reg && <><input className={inp} placeholder="Company name" {...register("companyName")} /><input className={inp} placeholder="Your name" {...register("name")} /></>}
      <input className={inp} placeholder="Email" {...register("email")} />{errors.email && <p className="text-xs text-brand-red">{errors.email.message}</p>}
      <input className={inp} type="password" placeholder="Password" {...register("password")} />{errors.password && <p className="text-xs text-brand-red">{errors.password.message}</p>}
      {msg && <p className="text-sm text-brand-red">{msg}</p>}
      <Button className="w-full" disabled={isSubmitting}>{isSubmitting ? "Please wait…" : reg ? "Register" : "Login"}</Button>
      <button type="button" onClick={() => setReg(!reg)} className="w-full text-center text-sm text-brand-muted">{reg ? "Have an account? Sign in" : "New company? Register"}</button>
    </form></main>);
}
