"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  Ban, 
  Layers, 
  Activity, 
  Server,
  Zap,
  ArrowUpRight,
  ScanFace,
  Plus,
  Edit3,
  Sliders,
  Calendar,
  Check,
  X
} from "lucide-react";
import dynamic from "next/dynamic";
const PlatformRevenueChart = dynamic(
  () => import("@/components/charts").then(m => m.PlatformRevenueChart),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-neutral-100" /> }
);
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { Field, Modal, inp } from "@/components/ui/modal";
import { api, inr } from "@/lib/api";

type CompanyItem = {
  id: string;
  slug: string;
  status: string;
  createdAt: string;
  company: { 
    name: string; 
    phone?: string; 
    address?: string; 
    gstin?: string; 
    timezone?: string; 
  } | null;
  subscription?: {
    id: string;
    status: string;
    cycle: string;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    plan: { id: string; name: string; code: string; monthlyPrice: number; yearlyPrice: number } | null;
  } | null;
  _count: { users: number; branches: number };
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [companies, setCompanies] = useState<CompanyItem[] | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assignPlanTarget, setAssignPlanTarget] = useState<CompanyItem | null>(null);
  const [editCompanyTarget, setEditCompanyTarget] = useState<CompanyItem | null>(null);

  // Create Company Form state
  const [createForm, setCreateForm] = useState({
    companyName: "",
    ownerName: "",
    ownerEmail: "",
    password: "Password@123",
    planId: "",
    subscriptionStatus: "ACTIVE" as "ACTIVE" | "TRIAL",
    durationDays: 365,
    phone: "",
    gstin: "",
    address: ""
  });

  // Assign Plan Form state
  const [assignForm, setAssignForm] = useState({
    planId: "",
    status: "ACTIVE" as "ACTIVE" | "TRIAL" | "EXPIRED",
    cycle: "YEARLY" as "MONTHLY" | "YEARLY",
    durationDays: 365
  });

  // Edit Company Form state
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    gstin: "",
    address: "",
    status: "ACTIVE" as "ACTIVE" | "SUSPENDED"
  });

  const loadData = useCallback(() => {
    setRefreshing(true);
    setError("");
    Promise.allSettled([
      api<any>("/super-admin/stats").then(setStats),
      api<CompanyItem[]>("/super-admin/companies").then(setCompanies),
      api<any[]>("/super-admin/plans").then(setPlans),
    ])
      .catch((e: any) => setError(e.message))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  const openCompanyDashboard = async (id: string) => {
    try {
      const res = await api<{ accessToken: string }>(`/super-admin/companies/${id}/access`, {
        method: "POST",
      });
      sessionStorage.setItem("sat", sessionStorage.getItem("at")!);
      sessionStorage.setItem("at", res.accessToken);
      window.location.href = "/app/dashboard";
    } catch (err: any) {
      alert("Failed to access company dashboard: " + err.message);
    }
  };

  const handleStatusToggle = async (id: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this company as ${newStatus}?`)) return;
    try {
      await api(`/super-admin/companies/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(`Company status updated to ${newStatus}`);
      loadData();
    } catch (err: any) {
      alert("Error changing status: " + err.message);
    }
  };

  // Handle Create Company Submit
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.companyName.trim() || !createForm.ownerEmail.trim()) {
      alert("Please fill required company and owner details");
      return;
    }
    try {
      await api("/super-admin/companies", {
        method: "POST",
        body: JSON.stringify(createForm)
      });
      setShowCreateModal(false);
      setCreateForm({
        companyName: "",
        ownerName: "",
        ownerEmail: "",
        password: "Password@123",
        planId: "",
        subscriptionStatus: "ACTIVE",
        durationDays: 365,
        phone: "",
        gstin: "",
        address: ""
      });
      showToast("New company registered and workspace initialized!");
      loadData();
    } catch (err: any) {
      alert("Failed to create company: " + err.message);
    }
  };

  // Handle Assign Plan Submit
  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignPlanTarget || !assignForm.planId) return;
    try {
      await api(`/super-admin/companies/${assignPlanTarget.id}/plan`, {
        method: "PATCH",
        body: JSON.stringify({
          planId: assignForm.planId,
          status: assignForm.status,
          cycle: assignForm.cycle,
          durationDays: Number(assignForm.durationDays)
        })
      });
      setAssignPlanTarget(null);
      showToast(`Plan successfully assigned to ${assignPlanTarget.company?.name || assignPlanTarget.slug}!`);
      loadData();
    } catch (err: any) {
      alert("Failed to assign plan: " + err.message);
    }
  };

  // Open Edit Company Modal
  const openEditModal = (c: CompanyItem) => {
    setEditCompanyTarget(c);
    setEditForm({
      name: c.company?.name || "",
      phone: c.company?.phone || "",
      gstin: c.company?.gstin || "",
      address: c.company?.address || "",
      status: (c.status as any) || "ACTIVE"
    });
  };

  // Handle Edit Company Submit
  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCompanyTarget) return;
    try {
      await api(`/super-admin/companies/${editCompanyTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm)
      });
      setEditCompanyTarget(null);
      showToast(`Company profile updated successfully!`);
      loadData();
    } catch (err: any) {
      alert("Failed to update company: " + err.message);
    }
  };

  // Open Assign Plan Modal
  const openAssignModal = (c: CompanyItem) => {
    setAssignPlanTarget(c);
    const existingPlanId = c.subscription?.plan?.id || plans[0]?.id || "";
    setAssignForm({
      planId: existingPlanId,
      status: (c.subscription?.status as any) || "ACTIVE",
      cycle: (c.subscription?.cycle as any) || "YEARLY",
      durationDays: 365
    });
  };

  // Filter companies
  const filteredCompanies = (companies || []).filter((c) => {
    const matchSearch =
      (c.company?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Revenue projection for chart
  const revenueChartData = [
    { month: "Jun", mrr: 12000, users: 45 },
    { month: "Jul", mrr: 24000, users: 80 },
    { month: "Aug", mrr: 38000, users: 130 },
    { month: "Sep", mrr: 58000, users: 210 },
    { month: "Oct", mrr: 84000, users: 340 },
    { month: "Nov", mrr: stats?.mrr || 115000, users: stats?.employees || 480 },
  ];

  return (
    <div className="space-y-8 font-sans antialiased text-brand-text">
      {/* Top Banner Notice */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-red px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              Platform Master Console
            </span>
            <span className="text-xs font-semibold text-brand-muted">
              Live Governance & Multi-Tenant Telemetry
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-brand-black sm:text-3xl">
            Super Administrator Control Center
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="rounded-full px-4 text-xs font-bold"
            onClick={loadData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Telemetry
          </Button>

          <Button
            variant="primary"
            className="rounded-full px-5 text-xs font-bold shadow-md shadow-red-500/20 flex items-center gap-1.5"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4" /> Add New Company
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Cards Deck */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* MRR Card */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
              Monthly Recurring (MRR)
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-brand-black">
            {stats ? inr(stats.mrr) : "—"}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-semibold flex items-center">
              <ArrowUpRight className="h-3.5 w-3.5" /> ARR: {stats ? inr(stats.arr) : "—"}
            </span>
            <span className="text-brand-muted">Total Rev: {stats ? inr(stats.revenue) : "—"}</span>
          </div>
        </Card>

        {/* Tenant Companies */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
              Client Organizations
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-brand-black">
            {stats ? stats.companies : "—"}
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <span className="font-semibold text-emerald-600">
              {stats?.active ?? 0} Active
            </span>
            <span className="text-brand-muted">·</span>
            <span className="font-semibold text-rose-600">
              {stats?.suspended ?? 0} Suspended
            </span>
            <span className="text-brand-muted">·</span>
            <span className="text-neutral-500">
              +{stats?.newRegistrations30d ?? 0} (30d)
            </span>
          </div>
        </Card>

        {/* Managed Workforce */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
              Managed Workforce
            </span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-brand-black">
            {stats ? stats.employees : "—"}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-brand-muted">
            <span>Employees across all tenants</span>
            <span className="font-semibold text-brand-black">{stats?.branches ?? 0} Branches</span>
          </div>
        </Card>

        {/* Payment & Gateway Health */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
              Transaction Health
            </span>
            <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-black text-brand-black">
              {stats ? stats.successful : "—"}
            </p>
            <span className="text-xs font-semibold text-brand-muted">
              / {stats ? stats.transactions : "—"} Total
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-600">
              {stats?.transactions > 0
                ? `${Math.round((stats.successful / stats.transactions) * 100)}% Success`
                : "100% Rate"}
            </span>
            <span className="text-rose-600 font-semibold">{stats?.failed ?? 0} Failed</span>
          </div>
        </Card>
      </div>

      {/* Revenue & Growth Analytics Chart Section */}
      <Card className="p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border pb-4">
          <div>
            <h2 className="text-base font-bold text-brand-black">
              Platform Growth & Revenue Trajectory
            </h2>
            <p className="text-xs text-brand-muted">
              Real-time MRR projection and workforce user growth over recent periods.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-brand-red">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-red" /> MRR (₹)
            </span>
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Active Users
            </span>
          </div>
        </div>

        <div className="mt-6">
          <PlatformRevenueChart data={revenueChartData} />
        </div>
      </Card>

      {/* Enterprise Organization Directory Table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-brand-border p-6 bg-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-brand-black">
                Tenant Organizations Directory
              </h2>
              <p className="text-xs text-brand-muted">
                Audit, manage, assign plans, and impersonate client workspaces across the platform.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-brand-muted" />
                <input
                  type="text"
                  placeholder="Search organization or slug..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-56 rounded-lg border border-brand-border bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-brand-black"
                />
              </div>

              {/* Status Filter */}
              <div className="flex rounded-lg border border-brand-border bg-neutral-50 p-0.5 text-xs">
                {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-md px-2.5 py-1 font-semibold transition ${
                      statusFilter === st ? "bg-white text-brand-black shadow-xs" : "text-brand-muted"
                    }`}
                  >
                    {st === "ALL" ? "All" : st === "ACTIVE" ? "Active" : "Suspended"}
                  </button>
                ))}
              </div>

              <Button
                variant="primary"
                className="rounded-lg !px-3 !py-1 text-xs font-bold"
                onClick={() => setShowCreateModal(true)}
              >
                + Add Company
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-brand-border bg-neutral-50 text-brand-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Company / Organization</th>
                <th className="py-3 px-4">Assigned Plan & Status</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Users</th>
                <th className="py-3 px-4">Branches</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-brand-muted">
                    Loading tenant directory...
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-brand-muted">
                    No organizations matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((c) => {
                  const plan = c.subscription?.plan;
                  const subStatus = c.subscription?.status || "NO_PLAN";
                  return (
                    <tr key={c.id} className="transition hover:bg-neutral-50/60">
                      <td className="py-3.5 px-6 font-bold text-brand-black">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 place-items-center rounded-xl bg-neutral-900 font-extrabold text-white text-xs shrink-0">
                            {(c.company?.name || c.slug)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-brand-black">{c.company?.name || "Unnamed Company"}</p>
                            <p className="font-mono text-[10px] text-neutral-400">{c.slug}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-brand-black">
                              {plan ? plan.name : "Free / Trial"}
                            </span>
                            <span className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase ${
                              subStatus === "ACTIVE" 
                                ? "bg-emerald-100 text-emerald-800"
                                : subStatus === "TRIAL"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-neutral-100 text-neutral-700"
                            }`}>
                              {subStatus}
                            </span>
                          </div>
                          {c.subscription?.currentPeriodEnd && (
                            <p className="text-[10px] text-neutral-500">
                              Ends: {new Date(c.subscription.currentPeriodEnd).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            c.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              c.status === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-neutral-800">
                        {c._count.users}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-neutral-800">
                        {c._count.branches}
                      </td>

                      <td className="py-3.5 px-4 text-brand-muted">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Assign Plan Button */}
                          <Button
                            variant="outline"
                            className="!px-2.5 !py-1 text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50"
                            onClick={() => openAssignModal(c)}
                            title="Assign or change plan"
                          >
                            <Sliders className="h-3 w-3 mr-1 inline text-blue-600" /> Plan
                          </Button>

                          {/* Edit Company Profile Button */}
                          <Button
                            variant="outline"
                            className="!px-2.5 !py-1 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                            onClick={() => openEditModal(c)}
                            title="Edit company profile"
                          >
                            <Edit3 className="h-3 w-3 mr-1 inline" /> Edit
                          </Button>

                          {/* Impersonate Access */}
                          <Button
                            variant="dark"
                            className="!px-2.5 !py-1 text-xs flex items-center gap-1 font-bold"
                            onClick={() => openCompanyDashboard(c.id)}
                            title="Log in as company owner"
                          >
                            <ExternalLink className="h-3 w-3" /> Dashboard
                          </Button>

                          {c.status === "ACTIVE" ? (
                            <Button
                              variant="outline"
                              className="!px-2 !py-1 text-xs text-rose-600 hover:bg-rose-50"
                              onClick={() => handleStatusToggle(c.id, "SUSPENDED")}
                              title="Suspend organization"
                            >
                              <Ban className="h-3 w-3 inline" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              className="!px-2 !py-1 text-xs text-emerald-600 hover:bg-emerald-50"
                              onClick={() => handleStatusToggle(c.id, "ACTIVE")}
                              title="Activate organization"
                            >
                              <CheckCircle2 className="h-3 w-3 inline" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE NEW COMPANY MODAL */}
      {showCreateModal && (
        <Modal title="Add New Client Organization" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateCompany} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company Legal Name *">
                <input
                  required
                  className={inp}
                  placeholder="Apex Global Ltd"
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                />
              </Field>

              <Field label="Owner Full Name *">
                <input
                  required
                  className={inp}
                  placeholder="Rajesh Sharma"
                  value={createForm.ownerName}
                  onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                />
              </Field>

              <Field label="Owner Login Email *">
                <input
                  type="email"
                  required
                  className={inp}
                  placeholder="rajesh@apex.com"
                  value={createForm.ownerEmail}
                  onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                />
              </Field>

              <Field label="Initial Password *">
                <input
                  required
                  className={inp}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
              </Field>

              <Field label="Assign Subscription Plan">
                <select
                  className={inp}
                  value={createForm.planId}
                  onChange={(e) => setCreateForm({ ...createForm, planId: e.target.value })}
                >
                  <option value="">— Select Plan —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.monthlyPrice}/mo, max {p.maxEmployees} staff)
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Subscription Status">
                <select
                  className={inp}
                  value={createForm.subscriptionStatus}
                  onChange={(e) => setCreateForm({ ...createForm, subscriptionStatus: e.target.value as any })}
                >
                  <option value="ACTIVE">ACTIVE (Full Paid Access)</option>
                  <option value="TRIAL">TRIAL (14-Day Free Evaluation)</option>
                </select>
              </Field>

              <Field label="Plan Duration (Days)">
                <input
                  type="number"
                  min="1"
                  className={inp}
                  value={createForm.durationDays}
                  onChange={(e) => setCreateForm({ ...createForm, durationDays: Number(e.target.value) })}
                />
              </Field>

              <Field label="Contact Phone">
                <input
                  className={inp}
                  placeholder="+91 98765 43210"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="GSTIN / Corporate Tax ID">
                  <input
                    className={inp}
                    placeholder="07AAAAA0000A1Z5"
                    value={createForm.gstin}
                    onChange={(e) => setCreateForm({ ...createForm, gstin: e.target.value })}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Registered Address">
                  <input
                    className={inp}
                    placeholder="Connaught Place, New Delhi"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="font-bold">
                Initialize Company Workspace
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ASSIGN PLAN MODAL */}
      {assignPlanTarget && (
        <Modal
          title={`Assign Plan: ${assignPlanTarget.company?.name || assignPlanTarget.slug}`}
          onClose={() => setAssignPlanTarget(null)}
        >
          <form onSubmit={handleAssignPlan} className="space-y-4">
            <div className="rounded-xl bg-neutral-50 p-3 text-xs border border-brand-border">
              <p className="text-neutral-500 font-semibold">Currently Active Subscription:</p>
              <p className="font-bold text-brand-black text-sm mt-0.5">
                {assignPlanTarget.subscription?.plan?.name || "No Plan Assigned"} · Status: {assignPlanTarget.subscription?.status || "None"}
              </p>
            </div>

            <Field label="Select Target Plan *">
              <select
                required
                className={inp}
                value={assignForm.planId}
                onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}
              >
                <option value="">— Select Plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{p.monthlyPrice}/mo (Max {p.maxEmployees} Staff, {p.maxBranches} Branches)
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Subscription Status">
                <select
                  className={inp}
                  value={assignForm.status}
                  onChange={(e) => setAssignForm({ ...assignForm, status: e.target.value as any })}
                >
                  <option value="ACTIVE">ACTIVE (Fully Activated)</option>
                  <option value="TRIAL">TRIAL (Evaluation Mode)</option>
                  <option value="EXPIRED">EXPIRED (Suspended)</option>
                </select>
              </Field>

              <Field label="Billing Cycle">
                <select
                  className={inp}
                  value={assignForm.cycle}
                  onChange={(e) => setAssignForm({ ...assignForm, cycle: e.target.value as any })}
                >
                  <option value="YEARLY">YEARLY</option>
                  <option value="MONTHLY">MONTHLY</option>
                </select>
              </Field>
            </div>

            <Field label="Duration Window">
              <select
                className={inp}
                value={assignForm.durationDays}
                onChange={(e) => setAssignForm({ ...assignForm, durationDays: Number(e.target.value) })}
              >
                <option value="14">14 Days (Free Trial)</option>
                <option value="30">30 Days (1 Month)</option>
                <option value="90">90 Days (Quarterly)</option>
                <option value="365">365 Days (1 Year Full License)</option>
                <option value="1095">1,095 Days (3 Year Enterprise Contract)</option>
              </select>
            </Field>

            <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
              <Button type="button" variant="outline" onClick={() => setAssignPlanTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="font-bold">
                Confirm & Update Plan
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT COMPANY PROFILE MODAL */}
      {editCompanyTarget && (
        <Modal
          title={`Edit Organization: ${editCompanyTarget.company?.name || editCompanyTarget.slug}`}
          onClose={() => setEditCompanyTarget(null)}
        >
          <form onSubmit={handleEditCompany} className="space-y-4">
            <Field label="Company Legal Name *">
              <input
                required
                className={inp}
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact Phone">
                <input
                  className={inp}
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </Field>

              <Field label="Account Status">
                <select
                  className={inp}
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </Field>
            </div>

            <Field label="GSTIN / Corporate Tax ID">
              <input
                className={inp}
                value={editForm.gstin}
                onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
              />
            </Field>

            <Field label="Registered Address">
              <textarea
                rows={2}
                className={inp}
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
              <Button type="button" variant="outline" onClick={() => setEditCompanyTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="font-bold">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
