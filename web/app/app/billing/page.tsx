"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  CreditCard, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Users, 
  Receipt, 
  Calendar, 
  Zap,
  RefreshCw,
  Sliders,
  DollarSign,
  Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMe } from "@/components/me";
import { api, inr } from "@/lib/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxEmployees: number;
  maxBranches: number;
  trialDays: number;
  features?: any;
}

interface CurrentSubscription {
  id: string;
  tenantId: string;
  planId: string;
  cycle: "MONTHLY" | "YEARLY";
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  autoRenew?: boolean;
  plan: SubscriptionPlan;
}

interface PaymentHistoryItem {
  id: string;
  amount: number;
  cycle: string;
  status: string;
  invoiceNo: string | null;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  createdAt: string;
  paidAt: string | null;
  plan: {
    name: string;
  };
}

export default function Billing() {
  const me = useMe();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [sub, setSub] = useState<CurrentSubscription | null>(null);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [autoRenew, setAutoRenew] = useState(true);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  // Helper to load Razorpay Checkout JS dynamically
  const loadRazorpaySDK = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        return resolve(true);
      }
      const existing = document.getElementById("razorpay-sdk");
      if (existing) {
        existing.addEventListener("load", () => resolve(true));
        existing.addEventListener("error", () => resolve(false));
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const loadData = useCallback(() => {
    Promise.allSettled([
      api<SubscriptionPlan[]>("/plans").then(setPlans),
      api<CurrentSubscription>("/billing/subscription").then(setSub),
      api<PaymentHistoryItem[]>("/billing/history").then(setHistory).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
    loadRazorpaySDK();
  }, [loadData]);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(""), 7000);
  };

  // Toggle Auto-Renew / Auto-Debit on existing active subscription
  const handleToggleAutoRenew = async () => {
    if (!sub) return;
    setTogglingAutoRenew(true);
    try {
      const nextState = sub.autoRenew === false ? true : false;
      const updated = await api<CurrentSubscription>("/billing/auto-renew", {
        method: "PATCH",
        body: JSON.stringify({ enabled: nextState })
      });
      setSub(updated);
      showNotification(
        nextState
          ? "Auto-Pay / Auto-Renew is now ENABLED! Your subscription will auto-debit on the renewal date."
          : "Auto-Pay / Auto-Renew has been PAUSED. Your account will not be auto-debited."
      );
    } catch (err: any) {
      showNotification(err.message || "Failed to update auto-renew setting", "error");
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  // Launch Official Razorpay Checkout Modal
  const handleSubscribe = async (planId: string) => {
    setPayingPlanId(planId);
    try {
      // 1. Ensure Razorpay SDK is ready
      const sdkReady = await loadRazorpaySDK();
      if (!sdkReady || typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Razorpay Checkout SDK could not be loaded. Please check your internet connection.");
      }

      // 2. Call backend to create order on Razorpay
      const order = await api<any>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId, cycle, autoRenew })
      });

      if (!order.keyId || !order.orderId) {
        throw new Error("Invalid Razorpay order configuration returned from server.");
      }

      // 3. Initialize and Open official Razorpay modal
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "HBS Workspace",
        description: `${order.planName} (${cycle}) Enterprise License${autoRenew ? " · Auto-Debit Mandate" : ""}`,
        order_id: order.orderId,
        image: typeof window !== "undefined" ? `${window.location.origin}/logo.png` : undefined,
        theme: {
          color: "#F21B2B"
        },
        prefill: {
          name: me?.name || "Company Owner",
        },
        notes: {
          autoRenew: autoRenew ? "true" : "false",
          cycle: cycle,
        },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await api("/billing/verify", {
              method: "POST",
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature
              })
            });
            showNotification(`Payment successful! Your ${order.planName} subscription is now active (${autoRenew ? "Auto-Pay / Auto-Renew Active" : "One-time Cycle"}).`);
            loadData();
          } catch (err: any) {
            showNotification(`Verification failed: ${err.message}`, "error");
          } finally {
            setPayingPlanId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setPayingPlanId(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        showNotification(`Payment failed: ${response.error?.description || "Transaction cancelled"}`, "error");
        setPayingPlanId(null);
      });

      rzp.open();
    } catch (err: any) {
      showNotification(err.message || "Failed to launch Razorpay", "error");
      setPayingPlanId(null);
    }
  };

  const isCurrentPlan = (planId: string) => {
    return sub?.planId === planId;
  };

  return (
    <div className="space-y-10 font-sans antialiased text-brand-text">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-red px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              Enterprise Billing & Licenses
            </span>
            <span className="text-xs font-semibold text-brand-muted">
              Live Checkout via Razorpay Gateway
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-brand-black sm:text-3xl">
            Subscription Plans & Invoices
          </h1>
          <p className="mt-1 text-xs text-brand-muted">
            Manage your organization's subscription tier, branch licenses, and invoice payment receipts.
          </p>
        </div>

        <Button
          variant="outline"
          className="rounded-full px-4 text-xs font-bold self-start sm:self-auto"
          onClick={loadData}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Status
        </Button>
      </div>

      {/* Toast Notification Alert */}
      {msg && (
        <div className={`flex items-center gap-2.5 rounded-xl p-4 text-xs font-bold transition shadow-xs ${
          msgType === "success" 
            ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border border-red-300 bg-red-50 text-red-800"
        }`}>
          {msgType === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />}
          <span>{msg}</span>
        </div>
      )}

      {/* Active Subscription Status Card */}
      {sub && (
        <Card className="border-2 border-brand-black/10 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="rounded-md bg-brand-red px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  Active Subscription
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                  sub.status === "ACTIVE" 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : sub.status === "TRIAL"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}>
                  {sub.status === "TRIAL" ? "14-Day Free Evaluation" : sub.status}
                </span>
              </div>

              <h2 className="text-2xl font-black text-white sm:text-3xl">
                {sub.plan.name} Tier
              </h2>

              <p className="text-xs text-neutral-400 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                {sub.currentPeriodEnd ? (
                  <span>Next Renewal Date: <strong>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</strong></span>
                ) : sub.trialEndsAt ? (
                  <span>Trial Period Ends: <strong>{new Date(sub.trialEndsAt).toLocaleDateString()}</strong></span>
                ) : (
                  <span>Lifetime Managed License</span>
                )}
                <span>·</span>
                <span className="uppercase font-mono text-[10px] text-neutral-300">Cycle: {sub.cycle}</span>
              </p>

              {/* Auto-Debit Mandate Status & Action */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  sub.autoRenew !== false 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}>
                  <Zap className="h-3 w-3" />
                  Auto-Debit: {sub.autoRenew !== false ? "ACTIVE (Auto-Renews)" : "PAUSED (Manual Renewal)"}
                </span>

                <button
                  type="button"
                  disabled={togglingAutoRenew}
                  onClick={handleToggleAutoRenew}
                  className="rounded-full bg-neutral-800 px-3 py-1 text-[10px] font-bold text-neutral-200 hover:bg-neutral-700 hover:text-white transition border border-neutral-700 disabled:opacity-50 cursor-pointer"
                >
                  {togglingAutoRenew ? "Updating..." : sub.autoRenew !== false ? "Pause Auto-Debit" : "Enable Auto-Debit"}
                </button>
              </div>
            </div>

            {/* Capacity Limits Grid */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-neutral-900/80 p-4 border border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-400 text-[10px] uppercase font-bold block">Branch Limit:</span>
                <span className="text-lg font-black text-white">{sub.plan.maxBranches} Offices</span>
                <p className="text-[10px] text-neutral-500">Cross-branch scoping</p>
              </div>

              <div>
                <span className="text-neutral-400 text-[10px] uppercase font-bold block">Staff Capacity:</span>
                <span className="text-lg font-black text-white">{sub.plan.maxEmployees} Employees</span>
                <p className="text-[10px] text-neutral-500">Active roster slots</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Plan Selection Deck (Styled exactly like the Home Page) */}
      <section className="space-y-6">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-red">
            Upgrade Or Modify Plan
          </span>
          <h2 className="mt-1 text-2xl font-black text-brand-black sm:text-3xl">
            Choose The Plan That Scales With Your Team
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-xs text-brand-muted">
            All plans include in-browser 3D AI face biometrics, rotational shift rostering, and automated PF/ESI payroll processing.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-6 inline-flex items-center rounded-full border border-brand-border bg-white p-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => setCycle("MONTHLY")}
              className={`rounded-full px-5 py-2 text-xs font-bold transition ${
                cycle === "MONTHLY"
                  ? "bg-brand-black text-white shadow-xs"
                  : "text-brand-muted hover:text-brand-black"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setCycle("YEARLY")}
              className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold transition ${
                cycle === "YEARLY"
                  ? "bg-brand-black text-white shadow-xs"
                  : "text-brand-muted hover:text-brand-black"
              }`}
            >
              Annual Billing
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                Save 20%
              </span>
            </button>
          </div>

          {/* Auto-Debit (Auto-Pay) Mandate Consent Card */}
          <div className="mt-6 mx-auto rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/90 p-4 shadow-xs text-left">
            <label className="flex items-start gap-3.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-2 border-emerald-500 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-neutral-900">
                    Enable Auto-Pay (Auto-Debit Mandate)
                  </span>
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Auto-renew subscription at the end of each {cycle === "YEARLY" ? "year" : "month"} via Razorpay UPI / Card mandate. Zero interruption to employee face biometrics or payroll. <strong className="text-neutral-900">Cancel or pause anytime in 1 click.</strong>
                </p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 pt-0.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Authorized securely via Razorpay e-Mandate · No hidden fees</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Starter Plan */}
          <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-white p-7 shadow-xs hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-brand-black">Starter</h3>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                  Single Location
                </span>
              </div>
              <p className="mt-2 text-xs text-brand-muted">
                Essential tools for single-location companies and startups.
              </p>

              <div className="mt-5 flex items-baseline">
                <span className="text-3xl font-black text-brand-black">
                  {cycle === "YEARLY" ? "₹4,990" : "₹499"}
                </span>
                <span className="ml-1 text-xs font-semibold text-brand-muted">
                  /{cycle === "YEARLY" ? "year" : "month"}
                </span>
              </div>

              <div className="mt-6 border-t border-brand-border pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-black">
                  What's Included:
                </p>
                <ul className="mt-3.5 space-y-2.5 text-xs text-neutral-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>1 Branch</strong> Office Managed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Up to <strong>25 Active Employees</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>In-Browser Face Biometrics</strong> with Liveness</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>General & Morning Shifts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Leave Tracking & Approvals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Automated Monthly Payslips</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-brand-border">
              {isCurrentPlan(plans.find(p => p.code === "STARTER")?.id || "") ? (
                <div className="w-full rounded-full bg-neutral-100 py-2.5 text-center text-xs font-black text-neutral-700">
                  Current Active Plan
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full rounded-full font-bold flex items-center justify-center gap-2"
                  disabled={payingPlanId !== null}
                  onClick={() => {
                    const p = plans.find(x => x.code === "STARTER");
                    if (p) handleSubscribe(p.id);
                  }}
                >
                  <CreditCard className="h-4 w-4" />
                  {payingPlanId === plans.find(p => p.code === "STARTER")?.id ? "Opening Razorpay..." : "Upgrade with Razorpay"}
                </Button>
              )}
              {!isCurrentPlan(plans.find(p => p.code === "STARTER")?.id || "") && (
                <p className="mt-2 text-[10px] text-center text-neutral-500 font-medium">
                  {autoRenew 
                    ? `Auto-renews ${cycle === "YEARLY" ? "yearly" : "monthly"} · Cancel anytime`
                    : `One-time payment for 1 ${cycle === "YEARLY" ? "year" : "month"}`}
                </p>
              )}
            </div>
          </div>

          {/* Business Plan (Highlighted / Most Popular) */}
          <div className="relative flex flex-col justify-between rounded-3xl border-2 border-brand-red bg-white p-7 shadow-xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-red px-4 py-0.5 text-xs font-black uppercase tracking-wider text-white shadow-xs">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-brand-black">Business</h3>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-brand-red">
                  Multi-Branch
                </span>
              </div>
              <p className="mt-2 text-xs text-brand-muted">
                Full multi-branch operations, rotational shifts & sales CRM.
              </p>

              <div className="mt-5 flex items-baseline">
                <span className="text-3xl font-black text-brand-black">
                  {cycle === "YEARLY" ? "₹14,990" : "₹1,499"}
                </span>
                <span className="ml-1 text-xs font-semibold text-brand-muted">
                  /{cycle === "YEARLY" ? "year" : "month"}
                </span>
              </div>

              <div className="mt-6 border-t border-brand-border pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-black">
                  Everything in Starter, plus:
                </p>
                <ul className="mt-3.5 space-y-2.5 text-xs text-neutral-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-red shrink-0" />
                    <span>Up to <strong>5 Branch Offices</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-red shrink-0" />
                    <span>Up to <strong>100 Active Employees</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-red shrink-0" />
                    <span><strong>Rotational & Night Shifts</strong> (Safe Work Date)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-red shrink-0" />
                    <span><strong>Full CRM Pipeline</strong> (Deals, Leads, Activities)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-red shrink-0" />
                    <span>Statutory <strong>PF/ESI/PT/OT</strong> Payroll Engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-red shrink-0" />
                    <span>GPS Geofencing with Branch Radius</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-red shrink-0" />
                    <span>Expense Claims & Asset Tracking</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-brand-border">
              {isCurrentPlan(plans.find(p => p.code === "BUSINESS")?.id || "") ? (
                <div className="w-full rounded-full bg-neutral-900 py-2.5 text-center text-xs font-black text-white">
                  Current Active Plan
                </div>
              ) : (
                <Button
                  variant="primary"
                  className="w-full rounded-full font-bold shadow-md shadow-red-500/20 flex items-center justify-center gap-2"
                  disabled={payingPlanId !== null}
                  onClick={() => {
                    const p = plans.find(x => x.code === "BUSINESS");
                    if (p) handleSubscribe(p.id);
                  }}
                >
                  <CreditCard className="h-4 w-4" />
                  {payingPlanId === plans.find(p => p.code === "BUSINESS")?.id ? "Opening Razorpay..." : "Upgrade with Razorpay"}
                </Button>
              )}
              {!isCurrentPlan(plans.find(p => p.code === "BUSINESS")?.id || "") && (
                <p className="mt-2 text-[10px] text-center text-neutral-500 font-medium">
                  {autoRenew 
                    ? `Auto-renews ${cycle === "YEARLY" ? "yearly" : "monthly"} · Cancel anytime`
                    : `One-time payment for 1 ${cycle === "YEARLY" ? "year" : "month"}`}
                </p>
              )}
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-white p-7 shadow-xs hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-brand-black">Enterprise</h3>
                <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
                  Large Scale
                </span>
              </div>
              <p className="mt-2 text-xs text-brand-muted">
                Custom controls, nationwide branches, dedicated SLAs.
              </p>

              <div className="mt-5 flex items-baseline">
                <span className="text-3xl font-black text-brand-black">
                  {cycle === "YEARLY" ? "₹49,990" : "₹4,999"}
                </span>
                <span className="ml-1 text-xs font-semibold text-brand-muted">
                  /{cycle === "YEARLY" ? "year" : "month"}
                </span>
              </div>

              <div className="mt-6 border-t border-brand-border pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-black">
                  Everything in Business, plus:
                </p>
                <ul className="mt-3.5 space-y-2.5 text-xs text-neutral-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Up to <strong>50 Branch Offices</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Up to <strong>1,000+ Employees</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Unlimited Custom Shift Patterns</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Full 150+ Granular RBAC Permissions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>IT Helpdesk & Recruitment Pipelines</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Priority Support with 99.9% Uptime SLA</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-brand-border">
              {isCurrentPlan(plans.find(p => p.code === "ENTERPRISE")?.id || "") ? (
                <div className="w-full rounded-full bg-neutral-100 py-2.5 text-center text-xs font-black text-neutral-700">
                  Current Active Plan
                </div>
              ) : (
                <Button
                  variant="dark"
                  className="w-full rounded-full font-bold flex items-center justify-center gap-2"
                  disabled={payingPlanId !== null}
                  onClick={() => {
                    const p = plans.find(x => x.code === "ENTERPRISE");
                    if (p) handleSubscribe(p.id);
                  }}
                >
                  <CreditCard className="h-4 w-4" />
                  {payingPlanId === plans.find(p => p.code === "ENTERPRISE")?.id ? "Opening Razorpay..." : "Upgrade with Razorpay"}
                </Button>
              )}
              {!isCurrentPlan(plans.find(p => p.code === "ENTERPRISE")?.id || "") && (
                <p className="mt-2 text-[10px] text-center text-neutral-500 font-medium">
                  {autoRenew 
                    ? `Auto-renews ${cycle === "YEARLY" ? "yearly" : "monthly"} · Cancel anytime`
                    : `One-time payment for 1 ${cycle === "YEARLY" ? "year" : "month"}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Feature Comparison Matrix Table */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-xs">
          <div className="border-b border-brand-border bg-neutral-50 p-5">
            <h3 className="text-base font-black text-brand-black">
              Detailed Module & Feature Comparison
            </h3>
            <p className="text-xs text-brand-muted">
              Capabilities included across all subscription levels.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-border bg-neutral-100/60 font-bold text-brand-black">
                  <th className="p-3.5">Capability / Module</th>
                  <th className="p-3.5">Starter</th>
                  <th className="p-3.5 text-brand-red">Business</th>
                  <th className="p-3.5">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-neutral-700">
                <tr>
                  <td className="p-3.5 font-semibold text-brand-black">Maximum Branch Offices</td>
                  <td className="p-3.5">1 Branch</td>
                  <td className="p-3.5 font-semibold text-brand-red">5 Branches</td>
                  <td className="p-3.5 font-bold text-brand-black">50 Branches</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-brand-black">Employee User Limit</td>
                  <td className="p-3.5">Up to 25 Staff</td>
                  <td className="p-3.5 font-semibold text-brand-red">Up to 100 Staff</td>
                  <td className="p-3.5 font-bold text-brand-black">1,000+ Staff</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-brand-black">AI Face Biometric Liveness</td>
                  <td className="p-3.5"><Check className="h-4 w-4 text-emerald-600" /></td>
                  <td className="p-3.5"><Check className="h-4 w-4 text-brand-red" /></td>
                  <td className="p-3.5"><Check className="h-4 w-4 text-emerald-600" /></td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-brand-black">Shift Types Supported</td>
                  <td className="p-3.5">General / Morning</td>
                  <td className="p-3.5 font-semibold text-brand-red">All (Night, Rotational, Split)</td>
                  <td className="p-3.5 font-bold text-brand-black">Unlimited Custom Shifts</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-brand-black">Colleague Shift Swapping</td>
                  <td className="p-3.5 text-neutral-400">—</td>
                  <td className="p-3.5"><Check className="h-4 w-4 text-brand-red" /></td>
                  <td className="p-3.5"><Check className="h-4 w-4 text-emerald-600" /></td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-brand-black">CRM Deals & Pipeline Kanban</td>
                  <td className="p-3.5 text-neutral-400">—</td>
                  <td className="p-3.5"><Check className="h-4 w-4 text-brand-red" /></td>
                  <td className="p-3.5"><Check className="h-4 w-4 text-emerald-600" /></td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-brand-black">Statutory Payroll (PF/ESI/PT)</td>
                  <td className="p-3.5">Basic Payslips</td>
                  <td className="p-3.5 font-semibold text-brand-red">Full Statutory Engine</td>
                  <td className="p-3.5 font-bold text-brand-black">Full Engine + Bank CSV Export</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-brand-black">Expenses & IT Asset Tracking</td>
                  <td className="p-3.5 text-neutral-400">—</td>
                  <td className="p-3.5"><Check className="h-4 w-4 text-brand-red" /></td>
                  <td className="p-3.5"><Check className="h-4 w-4 text-emerald-600" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Invoice & Payment History */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-brand-border bg-white p-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-brand-black">
              Payment Invoices & Receipts
            </h3>
            <p className="text-xs text-brand-muted">
              Audit trail of all online transactions processed via Razorpay.
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">
            {history.length} Invoices
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-brand-border bg-neutral-50 font-bold uppercase tracking-wider text-neutral-500">
                <th className="py-3 px-5">Invoice No</th>
                <th className="py-3 px-4">Plan / Cycle</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-5 text-right">Razorpay Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border bg-white">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-brand-muted">
                    No payment receipts generated yet. Upgrades and renewals will appear here.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50">
                    <td className="py-3.5 px-5 font-bold font-mono text-brand-black">
                      {item.invoiceNo || `INV-${item.id.slice(0, 8).toUpperCase()}`}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-brand-black">
                      {item.plan?.name || "Subscription"} <span className="text-neutral-400">({item.cycle})</span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-brand-black">
                      {inr(item.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700"
                          : item.status === "CREATED"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          item.status === "PAID" ? "bg-emerald-500" : item.status === "CREATED" ? "bg-amber-500" : "bg-red-500"
                        }`} />
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500">
                      {new Date(item.paidAt || item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-[10px] text-neutral-400">
                      {item.razorpayPaymentId || item.razorpayOrderId}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
