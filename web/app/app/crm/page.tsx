"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  TrendingUp, 
  Kanban, 
  Users, 
  Building2, 
  Clock, 
  BarChart3, 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Phone, 
  Mail, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  ShieldCheck, 
  Check, 
  X, 
  UserPlus, 
  CalendarCheck, 
  Award, 
  Briefcase,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Target,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { Field, Modal, inp } from "@/components/ui/modal";
import { can, useMe } from "@/components/me";
import { api, inr } from "@/lib/api";

const STAGES = [
  "NEW_LEAD",
  "CONTACTED",
  "INTERESTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST"
] as const;

type Stage = typeof STAGES[number];

const STAGE_CONFIG: Record<Stage, { label: string; color: string; bg: string; border: string; text: string }> = {
  NEW_LEAD: { label: "New Lead", color: "bg-blue-500", bg: "bg-blue-50/70", border: "border-blue-200", text: "text-blue-700" },
  CONTACTED: { label: "Contacted", color: "bg-indigo-500", bg: "bg-indigo-50/70", border: "border-indigo-200", text: "text-indigo-700" },
  INTERESTED: { label: "Interested", color: "bg-amber-500", bg: "bg-amber-50/70", border: "border-amber-200", text: "text-amber-700" },
  PROPOSAL: { label: "Proposal Sent", color: "bg-purple-500", bg: "bg-purple-50/70", border: "border-purple-200", text: "text-purple-700" },
  NEGOTIATION: { label: "Negotiation", color: "bg-cyan-500", bg: "bg-cyan-50/70", border: "border-cyan-200", text: "text-cyan-700" },
  WON: { label: "Closed Won", color: "bg-emerald-500", bg: "bg-emerald-50/70", border: "border-emerald-200", text: "text-emerald-700" },
  LOST: { label: "Closed Lost", color: "bg-rose-500", bg: "bg-rose-50/70", border: "border-rose-200", text: "text-rose-700" },
};

const SOURCES = ["Website", "Referral", "Social media", "Cold call", "Event", "Advertisement", "Other"];
const clean = (o: any) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));
const day = (s?: string) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function CrmPage() {
  return (
    <Suspense fallback={<div className="p-8 space-y-4"><Skeleton /><Skeleton /></div>}>
      <CrmContent />
    </Suspense>
  );
}

function CrmContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "Pipeline";
  const [tab, setTab] = useState(initialTab);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Sync tab with URL search parameter if it changes
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) setTab(t);
  }, [searchParams]);

  useEffect(() => {
    api<any[]>("/crm/users")
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-muted">
            <span>HBS Workspace</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-brand-black">Sales CRM</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-brand-black flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-brand-red" />
            Enterprise Sales CRM & Deals Pipeline
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Manage leads, track deals through pipeline stages, log communications, and forecast sales revenue.
          </p>
        </div>

        {/* Global Action Shortcut Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="rounded-full px-3.5 py-1.5 text-xs font-bold"
            onClick={() => setTab("Leads")}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5 text-brand-red" /> Add Lead
          </Button>
          <Button
            variant="primary"
            className="rounded-full px-4 py-1.5 text-xs font-bold shadow-md shadow-red-500/20"
            onClick={() => setTab("Pipeline")}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Deal
          </Button>
        </div>
      </div>

      {/* Global Toast Alert */}
      {msg && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-bold border ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-neutral-500 hover:text-neutral-900">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-brand-border pb-1">
        {[
          { id: "Pipeline", label: "Deals Pipeline", icon: Kanban, badge: "Kanban" },
          { id: "Leads", label: "Leads Directory", icon: Users },
          { id: "Customers", label: "Customers & Accounts", icon: Building2 },
          { id: "Tasks", label: "Tasks & Activities", icon: Clock },
          { id: "Reports", label: "Sales Analytics & Targets", icon: BarChart3 },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                active
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-brand-black"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? "text-brand-red" : "text-neutral-400"}`} />
              <span>{t.label}</span>
              {t.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[9px] font-black uppercase ${
                    active ? "bg-brand-red text-white" : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {tab === "Pipeline" && <PipelineView users={users} showToast={showToast} />}
      {tab === "Leads" && <LeadsView users={users} showToast={showToast} />}
      {tab === "Customers" && <CustomersView users={users} showToast={showToast} />}
      {tab === "Tasks" && <TasksView users={users} showToast={showToast} />}
      {tab === "Reports" && <ReportsView users={users} showToast={showToast} />}
    </div>
  );
}

// -------------------------------------------------------------
// 1. PIPELINE KANBAN VIEW
// -------------------------------------------------------------
function PipelineView({ users, showToast }: { users: any[]; showToast: (txt: string, type?: "success" | "error") => void }) {
  const me = useMe();
  const [deals, setDeals] = useState<any[] | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [lostModal, setLostModal] = useState<{ id: string; reason: string } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    customerId: "",
    value: "",
    stage: "NEW_LEAD" as Stage,
    expectedClose: "",
    ownerId: "",
  });

  const loadData = useCallback(() => {
    setLoading(true);
    api<any[]>("/crm/deals")
      .then(setDeals)
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));

    api<any>("/crm/customers?pageSize=200")
      .then((r) => setCustomers(r.items || []))
      .catch(() => {});
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Move deal to new stage
  const moveDeal = async (id: string, stage: Stage, lostReason?: string) => {
    try {
      await api(`/crm/deals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(clean({ stage, lostReason })),
      });
      showToast(`Deal moved to ${STAGE_CONFIG[stage].label}`);
      loadData();
    } catch (e: any) {
      showToast(e.message || "Failed to update deal", "error");
    }
  };

  const handleDrop = (stage: Stage) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("dealId") || draggedId;
    if (!id) return;
    if (stage === "LOST") {
      setLostModal({ id, reason: "" });
    } else {
      moveDeal(id, stage);
    }
    setDraggedId(null);
  };

  const createDeal = async () => {
    try {
      await api("/crm/deals", {
        method: "POST",
        body: JSON.stringify(
          clean({
            ...formData,
            value: Number(formData.value),
            expectedClose: formData.expectedClose ? new Date(formData.expectedClose).toISOString() : undefined,
          })
        ),
      });
      showToast("New deal created successfully!");
      setNewDealOpen(false);
      setFormData({
        title: "",
        customerId: "",
        value: "",
        stage: "NEW_LEAD",
        expectedClose: "",
        ownerId: "",
      });
      loadData();
    } catch (e: any) {
      showToast(e.message || "Failed to create deal", "error");
    }
  };

  const deleteDeal = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete deal "${title}"?`)) return;
    try {
      await api(`/crm/deals/${id}`, { method: "DELETE" });
      showToast(`Deal "${title}" deleted.`);
      loadData();
    } catch (e: any) {
      showToast(e.message || "Failed to delete deal", "error");
    }
  };

  if (!deals) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton /><Skeleton /><Skeleton /><Skeleton />
        </div>
        <Skeleton />
      </div>
    );
  }

  // Summary Metrics calculations
  const openDeals = deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  const totalOpenValue = openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
  const wonDeals = deals.filter((d) => d.stage === "WON");
  const totalWonValue = wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
  const lostDeals = deals.filter((d) => d.stage === "LOST");

  return (
    <div className="space-y-6">
      {/* Top Pipeline KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-muted">
            <span>Total Open Pipeline</span>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-brand-black">{inr(totalOpenValue)}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">{openDeals.length} active opportunities</p>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-muted">
            <span>Closed Won Revenue</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600">{inr(totalWonValue)}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">{wonDeals.length} deals won</p>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-muted">
            <span>Win Ratio</span>
            <Award className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-brand-black">
            {wonDeals.length + lostDeals.length > 0
              ? `${Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)}%`
              : "—"}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Based on {wonDeals.length + lostDeals.length} closed deals</p>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-muted">
            <span>Pipeline Velocity</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-brand-black">{deals.length}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Total recorded deal pipeline</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-600">Active Pipeline Kanban:</span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-neutral-800">
            {openDeals.length} In-Flight Deals
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            title="Refresh Kanban"
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand-red" : ""}`} />
            <span>Refresh</span>
          </button>
          {can(me, "crm:create") && (
            <Button
              variant="primary"
              className="rounded-full px-4 py-1.5 text-xs font-bold shadow-md shadow-red-500/20"
              onClick={() => setNewDealOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Opportunity
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board Horizontal Scroll Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
        {STAGES.map((s) => {
          const cfg = STAGE_CONFIG[s];
          const colDeals = deals.filter((d) => d.stage === s);
          const colSum = colDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

          return (
            <div
              key={s}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop(s)}
              className={`w-72 shrink-0 rounded-3xl border ${cfg.border} ${cfg.bg} p-3.5 flex flex-col min-h-[580px] shadow-xs transition-colors`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200/60">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${cfg.color}`} />
                  <span className="text-xs font-black text-brand-black">{cfg.label}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-neutral-600 shadow-2xs">
                    {colDeals.length}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-neutral-800">{inr(colSum)}</span>
              </div>

              {/* Deals Cards List */}
              <div className="mt-3 space-y-3 flex-1 overflow-y-auto pr-1">
                {colDeals.map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("dealId", d.id);
                      setDraggedId(d.id);
                    }}
                    className="group relative rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-neutral-400"
                  >
                    {/* Deal Title & Delete */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-black text-brand-black leading-snug">{d.title}</h4>
                      {can(me, "crm:delete") && (
                        <button
                          type="button"
                          onClick={() => deleteDeal(d.id, d.title)}
                          className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-brand-red transition p-0.5"
                          title="Delete deal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Company / Customer */}
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-500">
                      <Building2 className="h-3 w-3 shrink-0 text-neutral-400" />
                      <span className="truncate">{d.customer?.company || d.customer?.name || "Individual"}</span>
                    </div>

                    {/* Deal Value */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-black text-brand-black">{inr(d.value)}</span>
                      {d.expectedClose && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-neutral-400">
                          <Calendar className="h-3 w-3" />
                          {day(d.expectedClose)}
                        </span>
                      )}
                    </div>

                    {/* Lost Reason if Lost */}
                    {d.lostReason && (
                      <div className="mt-2 rounded-lg bg-rose-50 p-2 text-[10px] font-medium text-rose-700 border border-rose-100">
                        <strong>Reason:</strong> {d.lostReason}
                      </div>
                    )}

                    {/* Quick Move Dropdown */}
                    {can(me, "crm:edit") && (
                      <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase">Stage</span>
                        <select
                          className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-semibold text-neutral-700 outline-none hover:bg-neutral-100 cursor-pointer"
                          value={s}
                          onChange={(e) => {
                            const newSt = e.target.value as Stage;
                            if (newSt === "LOST") {
                              setLostModal({ id: d.id, reason: "" });
                            } else {
                              moveDeal(d.id, newSt);
                            }
                          }}
                        >
                          {STAGES.map((st) => (
                            <option key={st} value={st}>
                              {STAGE_CONFIG[st].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}

                {colDeals.length === 0 && (
                  <div className="grid place-items-center h-32 rounded-2xl border-2 border-dashed border-neutral-200/60 p-4 text-center">
                    <p className="text-[11px] font-semibold text-neutral-400">Drag deals here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Deal Modal */}
      {newDealOpen && (
        <Modal title="Create New Sales Opportunity" onClose={() => setNewDealOpen(false)}>
          <div className="space-y-4">
            <Field label="Deal Title / Opportunity Name">
              <input
                className={inp}
                placeholder="e.g. Enterprise CRM License - 50 Seats"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer Account">
                <select
                  className={inp}
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                >
                  <option value="">Select Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company ? `${c.company} (${c.name})` : c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Estimated Value (₹ INR)">
                <input
                  type="number"
                  className={inp}
                  placeholder="50000"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pipeline Stage">
                <select
                  className={inp}
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value as Stage })}
                >
                  {STAGES.map((st) => (
                    <option key={st} value={st}>
                      {STAGE_CONFIG[st].label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Target Close Date">
                <input
                  type="date"
                  className={inp}
                  value={formData.expectedClose}
                  onChange={(e) => setFormData({ ...formData, expectedClose: e.target.value })}
                />
              </Field>
            </div>

            {can(me, "crm:manage") && (
              <Field label="Opportunity Owner / Representative">
                <select
                  className={inp}
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                >
                  <option value="">Assign to Me</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-brand-border">
              <Button variant="outline" onClick={() => setNewDealOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!formData.title.trim() || !formData.customerId || !formData.value}
                onClick={createDeal}
              >
                Create Deal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mark Deal as Lost Modal */}
      {lostModal && (
        <Modal title="Mark Deal as Closed Lost" onClose={() => setLostModal(null)}>
          <div className="space-y-4">
            <p className="text-xs text-neutral-600">
              Please specify why this deal was lost so your team can analyze sales friction and improve conversion.
            </p>
            <Field label="Lost Reason">
              <input
                className={inp}
                placeholder="e.g. Budget constraints, chose competitor, timing not right..."
                value={lostModal.reason}
                onChange={(e) => setLostModal({ ...lostModal, reason: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setLostModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  moveDeal(lostModal.id, "LOST", lostModal.reason);
                  setLostModal(null);
                }}
              >
                Confirm Closed Lost
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 2. LEADS DIRECTORY VIEW
// -------------------------------------------------------------
function LeadsView({ users, showToast }: { users: any[]; showToast: (txt: string, type?: "success" | "error") => void }) {
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [convertModal, setConvertModal] = useState<any>(null);
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [leadForm, setLeadForm] = useState<any>({
    name: "",
    company: "",
    email: "",
    phone: "",
    source: "Website",
    priority: "MEDIUM",
    status: "NEW",
    notes: "",
    ownerId: "",
    nextFollowUpAt: "",
  });

  const loadLeads = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams(clean({ q, status, page: String(page) }) as any);
    api<any>(`/crm/leads?${params}`)
      .then(setData)
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [q, status, page, showToast]);

  useEffect(() => {
    const t = setTimeout(loadLeads, 200);
    return () => clearTimeout(t);
  }, [loadLeads]);

  const saveLead = async () => {
    try {
      const body = clean({
        ...leadForm,
        nextFollowUpAt: leadForm.nextFollowUpAt ? new Date(leadForm.nextFollowUpAt).toISOString() : undefined,
      });
      if (leadForm.id) {
        await api(`/crm/leads/${leadForm.id}`, { method: "PATCH", body: JSON.stringify(body) });
        showToast("Lead updated successfully!");
      } else {
        await api("/crm/leads", { method: "POST", body: JSON.stringify(body) });
        showToast("Lead created successfully!");
      }
      setModalOpen(false);
      loadLeads();
    } catch (e: any) {
      showToast(e.message || "Failed to save lead", "error");
    }
  };

  const convertLead = async () => {
    try {
      await api(`/crm/leads/${convertModal.id}/convert`, {
        method: "POST",
        body: JSON.stringify(
          clean({
            dealTitle: convertModal.title,
            value: convertModal.value === "" ? undefined : Number(convertModal.value),
          })
        ),
      });
      setConvertModal(null);
      showToast("Lead successfully converted to Customer and Deal!");
      loadLeads();
    } catch (e: any) {
      showToast(e.message || "Failed to convert lead", "error");
    }
  };

  const deleteLead = async (l: any) => {
    if (!confirm(`Are you sure you want to delete lead "${l.name}"?`)) return;
    try {
      await api(`/crm/leads/${l.id}`, { method: "DELETE" });
      showToast(`Lead "${l.name}" deleted.`);
      loadLeads();
    } catch (e: any) {
      showToast(e.message || "Failed to delete lead", "error");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/80 p-3.5 rounded-2xl border border-brand-border">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search leads by name, company, email, phone..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-full border border-neutral-300 bg-white py-1.5 pl-8 pr-4 text-xs text-brand-black placeholder-neutral-400 outline-none focus:border-brand-black"
            />
          </div>

          <select
            className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 outline-none focus:border-brand-black cursor-pointer"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="INTERESTED">Interested</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLeads}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand-red" : ""}`} />
            <span>Refresh</span>
          </button>
          {can(me, "crm:create") && (
            <Button
              variant="primary"
              className="rounded-full px-4 py-1.5 text-xs font-bold shadow-md shadow-red-500/20"
              onClick={() => {
                setLeadForm({
                  name: "",
                  company: "",
                  email: "",
                  phone: "",
                  source: "Website",
                  priority: "MEDIUM",
                  status: "NEW",
                  notes: "",
                  ownerId: "",
                  nextFollowUpAt: "",
                });
                setModalOpen(true);
              }}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add New Lead
            </Button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      {!data ? (
        <Skeleton />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-brand-border bg-neutral-50/70 font-bold text-neutral-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Lead Name & Company</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Next Follow-Up</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-neutral-700">
                {data.items?.map((l: any) => {
                  const isOverdue = l.nextFollowUpAt && new Date(l.nextFollowUpAt) < new Date() && l.status !== "CONVERTED";
                  return (
                    <tr key={l.id} className="hover:bg-neutral-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-neutral-900 font-bold text-white text-xs">
                            {l.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-brand-black">{l.name}</p>
                            <p className="text-[11px] text-brand-muted">{l.company || "Individual Client"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          {l.email && (
                            <p className="flex items-center gap-1.5 text-neutral-600">
                              <Mail className="h-3 w-3 text-neutral-400" /> {l.email}
                            </p>
                          )}
                          {l.phone && (
                            <p className="flex items-center gap-1.5 text-neutral-600">
                              <Phone className="h-3 w-3 text-neutral-400" /> {l.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                          {l.source}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            l.status === "CONVERTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : l.status === "LOST"
                              ? "bg-rose-100 text-rose-800"
                              : l.status === "INTERESTED"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`font-black text-[10px] uppercase ${
                            l.priority === "HIGH"
                              ? "text-brand-red"
                              : l.priority === "MEDIUM"
                              ? "text-amber-600"
                              : "text-neutral-500"
                          }`}
                        >
                          {l.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {l.nextFollowUpAt ? (
                          <span
                            className={`flex items-center gap-1 text-[11px] font-semibold ${
                              isOverdue ? "text-brand-red font-bold animate-pulse" : "text-neutral-600"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {day(l.nextFollowUpAt)}
                            {isOverdue && <span className="text-[9px] uppercase font-black">(Overdue)</span>}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={async () => {
                            const hist = await api<any[]>(`/crm/leads/${l.id}/history`);
                            setHistoryModal({ lead: l, items: hist });
                          }}
                          className="rounded-lg bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 font-semibold text-neutral-700 text-xs transition"
                        >
                          History
                        </button>

                        {l.status !== "CONVERTED" && can(me, "crm:edit") && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setLeadForm({
                                  ...l,
                                  nextFollowUpAt: l.nextFollowUpAt?.slice(0, 16) ?? "",
                                });
                                setModalOpen(true);
                              }}
                              className="rounded-lg bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 font-semibold text-neutral-700 text-xs transition"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => setConvertModal({ id: l.id, title: `${l.company || l.name} — Project`, value: "50000" })}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 font-bold text-white text-xs shadow-xs transition"
                            >
                              Convert &rarr;
                            </button>
                          </>
                        )}

                        {can(me, "crm:delete") && (
                          <button
                            type="button"
                            onClick={() => deleteLead(l)}
                            className="rounded-lg p-1 text-neutral-400 hover:text-brand-red transition inline-flex items-center"
                            title="Delete lead"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {data.items?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-brand-muted">
                      No leads matching your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-brand-border bg-neutral-50/50 p-4 text-xs font-semibold text-neutral-600">
            <span>Total: {data.total || 0} leads</span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={!data || page * data.pageSize >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Lead Modal */}
      {modalOpen && (
        <Modal title={leadForm.id ? "Edit Lead Details" : "Register New Lead Inward"} onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact Person Name *">
                <input
                  className={inp}
                  placeholder="e.g. Rohan Mehta"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                />
              </Field>

              <Field label="Company / Organization">
                <input
                  className={inp}
                  placeholder="e.g. Apex Tech Solutions"
                  value={leadForm.company}
                  onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email Address">
                <input
                  type="email"
                  className={inp}
                  placeholder="rohan@apex.com"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                />
              </Field>

              <Field label="Mobile / WhatsApp">
                <input
                  className={inp}
                  placeholder="+91 98765 43210"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Lead Source">
                <select
                  className={inp}
                  value={leadForm.source}
                  onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Priority Level">
                <select
                  className={inp}
                  value={leadForm.priority}
                  onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High Priority</option>
                </select>
              </Field>

              {leadForm.id && (
                <Field label="Status">
                  <select
                    className={inp}
                    value={leadForm.status}
                    onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="LOST">Lost</option>
                  </select>
                </Field>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Next Follow-Up Date & Time">
                <input
                  type="datetime-local"
                  className={inp}
                  value={leadForm.nextFollowUpAt}
                  onChange={(e) => setLeadForm({ ...leadForm, nextFollowUpAt: e.target.value })}
                />
              </Field>

              {can(me, "crm:manage") && (
                <Field label="Assign Sales Rep">
                  <select
                    className={inp}
                    value={leadForm.ownerId}
                    onChange={(e) => setLeadForm({ ...leadForm, ownerId: e.target.value })}
                  >
                    <option value="">{leadForm.id ? "(Unchanged)" : "Assign to Me"}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <Field label="Notes & Inward Details">
              <textarea
                className={`${inp} h-20`}
                placeholder="Client requirements, budget range, discussion notes..."
                value={leadForm.notes}
                onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-brand-border">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" disabled={leadForm.name.trim().length < 2} onClick={saveLead}>
                Save Lead
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Convert Lead to Customer & Deal Modal */}
      {convertModal && (
        <Modal title="Convert Lead into Opportunity" onClose={() => setConvertModal(null)}>
          <div className="space-y-4">
            <p className="text-xs text-neutral-600">
              Converting this lead will automatically provision a Customer Account and launch an open opportunity in your Deals Pipeline.
            </p>

            <Field label="Deal Opportunity Title">
              <input
                className={inp}
                placeholder="e.g. Website Overhaul + Hosting Deal"
                value={convertModal.title}
                onChange={(e) => setConvertModal({ ...convertModal, title: e.target.value })}
              />
            </Field>

            <Field label="Deal Value (₹ INR)">
              <input
                type="number"
                className={inp}
                placeholder="50000"
                value={convertModal.value}
                onChange={(e) => setConvertModal({ ...convertModal, value: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-brand-border">
              <Button variant="outline" onClick={() => setConvertModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={convertLead}>
                Convert to Deal & Customer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lead History Timeline Modal */}
      {historyModal && (
        <Modal title={`Activity Timeline · ${historyModal.lead?.name}`} onClose={() => setHistoryModal(null)}>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {historyModal.items?.map((act: any) => (
              <div key={act.id} className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/80 p-3 text-xs">
                <div className="rounded-lg bg-neutral-200 p-2 text-neutral-700">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-black">{act.kind}</span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(act.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-1 text-neutral-700">{act.subject}</p>
                </div>
              </div>
            ))}
            {(!historyModal.items || historyModal.items.length === 0) && (
              <p className="py-6 text-center text-xs text-brand-muted">No communication records logged yet.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 3. CUSTOMERS & ACCOUNTS VIEW
// -------------------------------------------------------------
function CustomersView({ users, showToast }: { users: any[]; showToast: (txt: string, type?: "success" | "error") => void }) {
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [custForm, setCustForm] = useState<any>({ name: "", company: "", email: "", phone: "", address: "", notes: "" });
  const [detailModal, setDetailModal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadCustomers = useCallback(() => {
    setLoading(true);
    api<any>(`/crm/customers?q=${encodeURIComponent(q)}`)
      .then(setData)
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [q, showToast]);

  useEffect(() => {
    const t = setTimeout(loadCustomers, 200);
    return () => clearTimeout(t);
  }, [loadCustomers]);

  const saveCustomer = async () => {
    try {
      const body = clean(custForm);
      if (custForm.id) {
        await api(`/crm/customers/${custForm.id}`, { method: "PATCH", body: JSON.stringify(body) });
        showToast("Customer profile updated!");
      } else {
        await api("/crm/customers", { method: "POST", body: JSON.stringify(body) });
        showToast("New customer created!");
      }
      setFormOpen(false);
      loadCustomers();
    } catch (e: any) {
      showToast(e.message || "Failed to save customer", "error");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Search Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-neutral-50/80 p-3.5 rounded-2xl border border-brand-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search customers by company or contact name..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-full border border-neutral-300 bg-white py-1.5 pl-8 pr-4 text-xs text-brand-black placeholder-neutral-400 outline-none focus:border-brand-black"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCustomers}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand-red" : ""}`} />
            <span>Refresh</span>
          </button>
          {can(me, "crm:create") && (
            <Button
              variant="primary"
              className="rounded-full px-4 py-1.5 text-xs font-bold shadow-md shadow-red-500/20"
              onClick={() => {
                setCustForm({ name: "", company: "", email: "", phone: "", address: "", notes: "" });
                setFormOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      {!data ? (
        <Skeleton />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-brand-border bg-neutral-50/70 font-bold text-neutral-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Account / Company</th>
                  <th className="py-3 px-4">Primary Contact</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Client Since</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-neutral-700">
                {data.items?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3 px-4 font-bold text-brand-black">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-brand-black">{c.company || c.name}</p>
                          {c.company && <p className="text-[11px] text-brand-muted">{c.name}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-neutral-800">{c.name}</td>
                    <td className="py-3 px-4 text-neutral-600">{c.email || "—"}</td>
                    <td className="py-3 px-4 text-neutral-600">{c.phone || "—"}</td>
                    <td className="py-3 px-4 text-neutral-500">{day(c.createdAt)}</td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={async () => {
                          const full = await api(`/crm/customers/${c.id}`);
                          setDetailModal(full);
                        }}
                        className="rounded-lg bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 font-semibold text-neutral-700 text-xs transition"
                      >
                        View Account
                      </button>

                      {can(me, "crm:edit") && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustForm(c);
                            setFormOpen(true);
                          }}
                          className="rounded-lg bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 font-semibold text-neutral-700 text-xs transition"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {data.items?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-brand-muted">
                      No customer accounts registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {formOpen && (
        <Modal title={custForm.id ? "Edit Customer Account" : "Register New Customer Account"} onClose={() => setFormOpen(false)}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact Person Name *">
                <input
                  className={inp}
                  placeholder="Primary contact name"
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                />
              </Field>

              <Field label="Company / Organization Name">
                <input
                  className={inp}
                  placeholder="Official company name"
                  value={custForm.company}
                  onChange={(e) => setCustForm({ ...custForm, company: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email Address">
                <input
                  type="email"
                  className={inp}
                  placeholder="billing@company.com"
                  value={custForm.email}
                  onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                />
              </Field>

              <Field label="Phone / Mobile">
                <input
                  className={inp}
                  placeholder="+91 99999 88888"
                  value={custForm.phone}
                  onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Office Address">
              <input
                className={inp}
                placeholder="Street address, City, Pincode"
                value={custForm.address}
                onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
              />
            </Field>

            <Field label="Account Notes">
              <textarea
                className={`${inp} h-20`}
                placeholder="Internal client notes..."
                value={custForm.notes}
                onChange={(e) => setCustForm({ ...custForm, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-brand-border">
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" disabled={(custForm.name || "").length < 2} onClick={saveCustomer}>
                Save Customer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Customer 360 Account Detail Modal */}
      {detailModal && (
        <Modal title={`${detailModal.company || detailModal.name} · Account Details`} onClose={() => setDetailModal(null)}>
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* Account Contact Header */}
            <div className="rounded-2xl bg-neutral-50 p-4 border border-brand-border space-y-1">
              <p className="text-xs font-bold text-brand-black">{detailModal.name}</p>
              <p className="text-xs text-neutral-600">{detailModal.email || "No email"} · {detailModal.phone || "No phone"}</p>
              {detailModal.address && <p className="text-xs text-neutral-500">{detailModal.address}</p>}
            </div>

            {/* Linked Deals */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-brand-black mb-2 flex items-center gap-1.5">
                <Kanban className="h-3.5 w-3.5 text-brand-red" /> Linked Opportunities ({detailModal.deals?.length || 0})
              </h4>
              <div className="space-y-2">
                {detailModal.deals?.map((x: any) => (
                  <div key={x.id} className="flex items-center justify-between rounded-xl border border-brand-border p-3 text-xs bg-white">
                    <div>
                      <p className="font-bold text-brand-black">{x.title}</p>
                      <p className="text-[11px] text-brand-muted">Stage: {x.stage}</p>
                    </div>
                    <span className="font-black text-sm text-brand-black">{inr(x.value)}</span>
                  </div>
                ))}
                {(!detailModal.deals || detailModal.deals.length === 0) && (
                  <p className="text-xs text-neutral-400 py-2">No deals linked to this customer yet.</p>
                )}
              </div>
            </div>

            {/* Communication History */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-brand-black mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" /> Communication Log ({detailModal.activities?.length || 0})
              </h4>
              <div className="space-y-2">
                {detailModal.activities?.map((a: any) => (
                  <div key={a.id} className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-brand-black">{a.kind}</span>
                      <span className="text-[10px] text-neutral-400">{day(a.createdAt)}</span>
                    </div>
                    <p className="text-neutral-700 mt-0.5">{a.subject}</p>
                  </div>
                ))}
                {(!detailModal.activities || detailModal.activities.length === 0) && (
                  <p className="text-xs text-neutral-400 py-2">No logged activities.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 4. TASKS & ACTIVITIES VIEW
// -------------------------------------------------------------
function TasksView({ users, showToast }: { users: any[]; showToast: (txt: string, type?: "success" | "error") => void }) {
  const me = useMe();
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("open");
  const [allTeam, setAllTeam] = useState(false);
  const [form, setForm] = useState<any>({ kind: "TASK", subject: "", dueAt: "", ownerId: "" });
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(() => {
    setLoading(true);
    api<any[]>(`/crm/activities?status=${status}${allTeam ? "&all=1" : ""}`)
      .then(setRows)
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [status, allTeam, showToast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = async () => {
    try {
      await api("/crm/activities", {
        method: "POST",
        body: JSON.stringify(
          clean({
            ...form,
            dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
          })
        ),
      });
      showToast("Activity task added successfully!");
      setForm({ kind: "TASK", subject: "", dueAt: "", ownerId: "" });
      loadTasks();
    } catch (e: any) {
      showToast(e.message || "Failed to add task", "error");
    }
  };

  const markDone = async (id: string) => {
    try {
      await api(`/crm/activities/${id}/complete`, { method: "POST" });
      showToast("Task completed!");
      loadTasks();
    } catch (e: any) {
      showToast(e.message || "Failed to complete task", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Add Activity Panel */}
      {can(me, "crm:create") && (
        <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-brand-black flex items-center gap-1.5">
            <CalendarCheck className="h-4 w-4 text-brand-red" /> Schedule Activity / Follow-Up Task
          </h3>

          <div className="grid gap-3 md:grid-cols-5">
            <Field label="Activity Type">
              <select
                className={inp}
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                <option value="TASK">Task</option>
                <option value="CALL">Phone Call</option>
                <option value="MEETING">Client Meeting</option>
                <option value="FOLLOW_UP">Follow-Up</option>
                <option value="NOTE">Quick Note</option>
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Task Subject / Agenda">
                <input
                  className={inp}
                  placeholder="e.g. Call client regarding price proposal review"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Due Date & Time">
              <input
                type="datetime-local"
                className={inp}
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              />
            </Field>

            <div className="flex items-end">
              <Button
                variant="primary"
                className="w-full text-xs font-bold"
                disabled={form.subject.trim().length < 2}
                onClick={addTask}
              >
                Schedule Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Task List */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-brand-border pb-4">
          <div className="flex items-center gap-3">
            <select
              className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-800 outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="open">Pending Tasks</option>
              <option value="done">Completed Activities</option>
            </select>

            {can(me, "crm:manage") && (
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allTeam}
                  onChange={(e) => setAllTeam(e.target.checked)}
                  className="rounded text-brand-red focus:ring-brand-red"
                />
                View Entire Team
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={loadTasks}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-brand-red" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Activities List */}
        <div className="space-y-3">
          {rows.map((a) => {
            const isOverdue = !a.doneAt && a.dueAt && new Date(a.dueAt) < new Date();
            return (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4 transition hover:bg-neutral-50"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-2xs border border-neutral-200 text-neutral-700">
                    {a.kind === "CALL" ? (
                      <Phone className="h-4 w-4 text-blue-600" />
                    ) : a.kind === "MEETING" ? (
                      <Users className="h-4 w-4 text-purple-600" />
                    ) : (
                      <CalendarCheck className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-brand-black">{a.subject}</span>
                      <span className="rounded bg-neutral-200 px-1.5 py-0.2 text-[9px] font-bold text-neutral-700">
                        {a.kind}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${isOverdue ? "font-bold text-brand-red" : "text-neutral-500"}`}>
                      {a.dueAt ? `${isOverdue ? "Overdue · " : "Due: "}${new Date(a.dueAt).toLocaleString("en-IN")}` : "No due date"}
                    </p>
                  </div>
                </div>

                {!a.doneAt && can(me, "crm:edit") && (
                  <Button
                    variant="outline"
                    className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-full px-3 py-1"
                    onClick={() => markDone(a.id)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Mark Done
                  </Button>
                )}
              </div>
            );
          })}

          {rows.length === 0 && (
            <p className="py-12 text-center text-xs text-brand-muted">
              No tasks found for this view.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. SALES ANALYTICS & TARGETS VIEW
// -------------------------------------------------------------
function ReportsView({ users, showToast }: { users: any[]; showToast: (txt: string, type?: "success" | "error") => void }) {
  const me = useMe();
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 864e5).toLocaleDateString("en-CA"));
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const [report, setReport] = useState<any>(null);
  const [targetForm, setTargetForm] = useState({ userId: "", amount: "" });
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(() => {
    setLoading(true);
    setReport(null);
    api(`/crm/reports?from=${from}&to=${to}`)
      .then(setReport)
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [from, to, showToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const saveTarget = async () => {
    try {
      await api("/crm/targets", {
        method: "PUT",
        body: JSON.stringify({
          userId: targetForm.userId,
          month: to.slice(0, 7),
          amount: Number(targetForm.amount),
        }),
      });
      showToast(`Monthly sales target assigned for ${to.slice(0, 7)}!`);
      loadReport();
    } catch (e: any) {
      showToast(e.message || "Failed to set target", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/80 p-3.5 rounded-2xl border border-brand-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-600">Reporting Date Window:</span>
          <input
            type="date"
            className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-800"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-neutral-400 text-xs">to</span>
          <input
            type="date"
            className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-800"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={loadReport}
          className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-brand-red" : ""}`} />
          <span>Generate Analytics</span>
        </button>
      </div>

      {!report ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton /><Skeleton /><Skeleton /><Skeleton />
          </div>
          <Skeleton />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold text-brand-muted uppercase">Inward Leads</span>
              <p className="mt-1 text-2xl font-black text-brand-black">{report.leads.total}</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{report.leads.conversionRate}% Conversion</p>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold text-brand-muted uppercase">Won Deals</span>
              <p className="mt-1 text-2xl font-black text-emerald-600">{inr(report.won.value)}</p>
              <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">{report.won.count} deals closed</p>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold text-brand-muted uppercase">Win Rate</span>
              <p className="mt-1 text-2xl font-black text-purple-600">{report.winRate}%</p>
              <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">Won vs Total Decisions</p>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold text-brand-muted uppercase">Weighted Forecast</span>
              <p className="mt-1 text-2xl font-black text-brand-black">{inr(report.pipeline.weightedValue)}</p>
              <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">{report.pipeline.open} open opportunities</p>
            </div>
          </div>

          {/* Breakdown Charts: Leads by Source & Pipeline by Stage */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Leads by Source */}
            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-brand-black flex items-center justify-between">
                <span>Leads by Acquisition Source</span>
                <span className="text-neutral-400">{report.leads.total} Leads</span>
              </h3>

              <div className="space-y-2.5 pt-2">
                {report.leads.bySource.map((x: any) => {
                  const pct = report.leads.total > 0 ? Math.round((x.count / report.leads.total) * 100) : 0;
                  return (
                    <div key={x.source} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-neutral-700">
                        <span>{x.source}</span>
                        <span>
                          {x.count} leads ({x.converted} converted)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {report.leads.bySource.length === 0 && (
                  <p className="text-xs text-brand-muted py-6 text-center">No leads captured in this timeframe.</p>
                )}
              </div>
            </div>

            {/* Pipeline by Stage */}
            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-brand-black flex items-center justify-between">
                <span>Pipeline Stage Distribution</span>
                <span className="text-neutral-400">{inr(report.pipeline.openValue)} Total</span>
              </h3>

              <div className="space-y-2.5 pt-2">
                {report.pipeline.byStage.map((x: any) => {
                  const pct = report.pipeline.openValue > 0 ? Math.round((x.value / report.pipeline.openValue) * 100) : 0;
                  return (
                    <div key={x.stage} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-neutral-700">
                        <span>{STAGE_CONFIG[x.stage as Stage]?.label || x.stage}</span>
                        <span>
                          {x.count} deals · {inr(x.value)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${STAGE_CONFIG[x.stage as Stage]?.color || "bg-neutral-800"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Team Target & Performance Matrix */}
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-black">
                  Sales Representative Performance
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Track individual conversions, won value, and quota attainment for {to.slice(0, 7)}.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-brand-border bg-neutral-50/70 font-bold text-neutral-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Salesperson</th>
                    <th className="py-2.5 px-3">Leads Handled</th>
                    <th className="py-2.5 px-3">Converted</th>
                    <th className="py-2.5 px-3">Deals Won</th>
                    <th className="py-2.5 px-3">Won Revenue</th>
                    <th className="py-2.5 px-3">Open Value</th>
                    <th className="py-2.5 px-3">Quota Target</th>
                    <th className="py-2.5 px-3">Attainment %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border text-neutral-700">
                  {report.team?.map((m: any) => (
                    <tr key={m.userId} className="hover:bg-neutral-50">
                      <td className="py-3 px-3 font-bold text-brand-black">{m.name}</td>
                      <td className="py-3 px-3">{m.leads}</td>
                      <td className="py-3 px-3 text-emerald-600 font-semibold">{m.converted}</td>
                      <td className="py-3 px-3">{m.dealsWon}</td>
                      <td className="py-3 px-3 font-bold text-brand-black">{inr(m.wonValue)}</td>
                      <td className="py-3 px-3 text-neutral-500">{inr(m.openValue)}</td>
                      <td className="py-3 px-3 font-semibold">{m.target ? inr(m.target) : "—"}</td>
                      <td className="py-3 px-3">
                        {m.achievement != null ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              m.achievement >= 100
                                ? "bg-emerald-100 text-emerald-800"
                                : m.achievement >= 60
                                ? "bg-amber-100 text-amber-800"
                                : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            {m.achievement}%
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Monthly Target Assignment Tool */}
            {can(me, "crm:manage") && (
              <div className="pt-4 border-t border-brand-border flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-brand-red" />
                  <span className="text-xs font-bold text-brand-black">Set Monthly Rep Quota ({to.slice(0, 7)}):</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 outline-none"
                    value={targetForm.userId}
                    onChange={(e) => setTargetForm({ ...targetForm, userId: e.target.value })}
                  >
                    <option value="">Select Representative...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="₹ Target Quota"
                    className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-black w-32 outline-none"
                    value={targetForm.amount}
                    onChange={(e) => setTargetForm({ ...targetForm, amount: e.target.value })}
                  />

                  <Button
                    variant="primary"
                    className="rounded-full px-4 py-1.5 text-xs font-bold"
                    disabled={!targetForm.userId || !targetForm.amount}
                    onClick={saveTarget}
                  >
                    Set Target
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
