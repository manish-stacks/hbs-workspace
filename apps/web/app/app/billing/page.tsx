"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, inr } from "@/lib/api";
declare global { interface Window { Razorpay: any } }
export default function Billing() {
  const [plans, setPlans] = useState<any[]>([]); const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY"); const [msg, setMsg] = useState("");
  useEffect(() => { api<any[]>("/plans").then(setPlans); const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; document.body.appendChild(s); }, []);
  const pay = async (planId: string) => {
    try {
      const o = await api<any>("/billing/checkout", { method: "POST", body: JSON.stringify({ planId, cycle }) });
      new window.Razorpay({ key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId, name: "HBS Workspace", description: o.planName,
        theme: { color: "#F21B2B" }, handler: async (r: any) => {
          await api("/billing/verify", { method: "POST", body: JSON.stringify({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }) });
          setMsg("Payment verified. Subscription active."); } }).open();
    } catch (e: any) { setMsg(e.message); }
  };
  return (<div className="mx-auto max-w-4xl space-y-4 p-6"><h1 className="text-2xl font-bold">Choose a plan</h1>
    <select value={cycle} onChange={e => setCycle(e.target.value as any)} className="rounded border border-brand-border px-3 py-2"><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select>
    {msg && <p className="text-sm text-brand-red">{msg}</p>}
    <div className="grid gap-4 md:grid-cols-3">{plans.map(p => <Card key={p.id}><h3 className="font-bold">{p.name}</h3><p className="text-2xl font-extrabold">{inr(cycle === "YEARLY" ? p.yearlyPrice : p.monthlyPrice)}</p>
      <p className="text-sm text-brand-muted">{p.maxEmployees} employees · {p.maxBranches} branches</p><Button className="mt-3 w-full" onClick={() => pay(p.id)}>Subscribe</Button></Card>)}</div></div>);
}
