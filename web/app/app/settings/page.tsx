"use client";

import { useEffect, useState } from "react";
import { 
  Building2, 
  ShieldCheck, 
  Users, 
  ScanFace, 
  Clock, 
  DollarSign, 
  Bell, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Sliders, 
  Key, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Smartphone, 
  MapPin, 
  Sparkles,
  Info,
  User,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Modal, inp } from "@/components/ui/modal";
import { can, useMe } from "@/components/me";
import { api } from "@/lib/api";

type SettingsTab = "ACCOUNT" | "PROFILE" | "ROLES" | "USERS" | "BIOMETRICS" | "SHIFTS" | "PAYROLL" | "NOTIFICATIONS";

export default function Settings() {
  const me = useMe();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<SettingsTab>("ACCOUNT");

  // Remote Data State
  const [co, setCo] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [perms, setPerms] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  
  // Owner Personal Account Credentials State
  const [ownerName, setOwnerName] = useState(me.name);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Custom Role Modal State
  const [role, setRole] = useState<any>(null);

  // Policy Settings (Client-managed / persisted)
  const [bioThreshold, setBioThreshold] = useState<string>("0.45");
  const [livenessMode, setLivenessMode] = useState<string>("RANDOM_CHALLENGE");
  const [geofenceEnforced, setGeofenceEnforced] = useState<boolean>(true);
  const [allowSelfEnroll, setAllowSelfEnroll] = useState<boolean>(false);
  
  const [lateGraceMinutes, setLateGraceMinutes] = useState<number>(15);
  const [safeWorkDateCutoff, setSafeWorkDateCutoff] = useState<string>("08:00");
  const [otRate, setOtRate] = useState<string>("1.5");
  const [shiftSwapPolicy, setShiftSwapPolicy] = useState<string>("SUPERVISOR_APPROVAL");

  const [pfRate, setPfRate] = useState<number>(12);
  const [esiRate, setEsiRate] = useState<number>(0.75);
  const [autoEmailPayslip, setAutoEmailPayslip] = useState<boolean>(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState<boolean>(true);

  const load = () => {
    api("/company").then(setCo).catch(() => {});
    api<any>("/auth/me").then(r => {
      if (r?.email) {
        setOwnerName(r.name);
        setOwnerEmail(r.email);
      }
    }).catch(() => {});

    if (can(me, "role:view")) {
      api<any[]>("/roles").then(setRoles).catch(() => {});
      api<string[]>("/permissions").then(setPerms).catch(() => {});
      api<any[]>("/users").then(setUsers).catch(() => {});
      api<any[]>("/branches").then(setBranches).catch(() => {});
      api<any[]>("/departments").then(setDepts).catch(() => {});
      api<any>("/face/policy").then(r => setAllowSelfEnroll(!!r.allowSelfEnroll)).catch(() => {});
    }
  };

  useEffect(load, []); // eslint-disable-line

  const wrap = async (f: () => Promise<any>, ok: string) => {
    try {
      await f();
      setMsg(ok);
      setMsgType("success");
      load();
      setTimeout(() => setMsg(""), 5000);
    } catch (e: any) {
      setMsg(String(e.message || "Operation failed"));
      setMsgType("error");
    }
  };

  const mods = [...new Set(perms.map(p => p.split(":")[0]))];
  const acts = [...new Set(perms.map(p => p.split(":")[1]))];

  // Save Owner Personal Profile (Name & Email)
  const saveOwnerProfile = () => wrap(async () => {
    if (!ownerName.trim() || !ownerEmail.trim()) {
      throw new Error("Name and email are required");
    }
    await api("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: ownerName, email: ownerEmail })
    });
  }, "Your owner profile credentials were successfully updated!");

  // Change Owner Password
  const saveOwnerPassword = () => wrap(async () => {
    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }
    if (newPassword !== confirmPassword) {
      throw new Error("New password and confirmation do not match");
    }
    await api("/auth/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword })
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, "Password updated successfully!");

  const saveCompany = () => wrap(async () => {
    await api("/company", {
      method: "PATCH",
      body: JSON.stringify({
        name: co.name,
        gstin: co.gstin || undefined,
        phone: co.phone || undefined,
        address: co.address || undefined,
        timezone: co.timezone || "Asia/Kolkata",
      }),
    });
  }, "Company profile updated successfully");

  const saveRole = () => wrap(async () => {
    const body = JSON.stringify({ name: role.name, permissions: role.permissions });
    await api(role.id ? `/roles/${role.id}` : "/roles", {
      method: role.id ? "PATCH" : "POST",
      body,
    });
    setRole(null);
  }, "Custom role saved successfully");

  const setAccess = (u: any, patch: any) => wrap(async () => {
    await api(`/users/${u.id}/access`, {
      method: "PUT",
      body: JSON.stringify({
        roleIds: u.roleIds,
        branchId: u.branchId || undefined,
        departmentId: u.departmentId || undefined,
        ...patch,
      }),
    });
  }, `Access permissions updated for ${u.name}`);

  const deleteRole = (r: any) => {
    if (confirm(`Are you sure you want to delete role "${r.name}"?`)) {
      wrap(() => api(`/roles/${r.id}`, { method: "DELETE" }), "Role deleted successfully");
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "ACCOUNT", label: "Owner Profile & Password", icon: User },
    { id: "PROFILE", label: "Company Profile", icon: Building2 },
    { id: "ROLES", label: "Roles & Permissions", icon: ShieldCheck },
    { id: "USERS", label: "Users & Scoped Access", icon: Users },
    { id: "BIOMETRICS", label: "Face AI & Biometrics", icon: ScanFace },
    { id: "SHIFTS", label: "Shift & Attendance Rules", icon: Clock },
    { id: "PAYROLL", label: "Payroll & Statutory", icon: DollarSign },
    { id: "NOTIFICATIONS", label: "Notifications & Alerts", icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-black sm:text-3xl">
            Settings & Governance Console
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Configure owner account credentials, organization identity, role permissions, and operational policies.
          </p>
        </div>

        {co && (
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-3.5 py-1.5 shadow-xs text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-brand-black font-bold truncate max-w-[160px]">{co.name}</span>
            <span className="text-neutral-400">|</span>
            <span className="text-[10px] text-neutral-500 font-mono">ID: {co.tenantId?.slice(0, 8)}...</span>
          </div>
        )}
      </div>

      {/* Toast Alert Message Banner */}
      {msg && (
        <div className={`flex items-center gap-2.5 rounded-xl p-3.5 text-xs font-bold transition shadow-xs ${
          msgType === "success" 
            ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border border-red-300 bg-red-50 text-red-800"
        }`}>
          {msgType === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{msg}</span>
        </div>
      )}

      {/* Tab Navigation Pill Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-brand-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-3 text-xs font-bold transition border-b-2 -mb-[2px] ${
                active
                  ? "border-brand-red bg-white text-brand-red shadow-xs font-black"
                  : "border-transparent text-neutral-500 hover:text-brand-black hover:bg-neutral-100"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-brand-red" : "text-neutral-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 0: OWNER ACCOUNT & SECURITY (NAME, EMAIL, PASSWORD) */}
      {activeTab === "ACCOUNT" && (
        <div className="space-y-6">
          {/* Personal Profile Details Card */}
          <Card>
            <div className="border-b border-brand-border pb-4 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-brand-black">Owner Account Credentials</h2>
                <p className="text-xs text-brand-muted">
                  Update your display name and login email address for this workspace.
                </p>
              </div>
              <span className="rounded-md bg-neutral-900 px-2.5 py-1 text-[10px] font-black uppercase text-white">
                {me.roles[0] || "Owner"}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Your Full Name *">
                <input
                  className={inp}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                />
              </Field>

              <Field label="Login Email Address *">
                <input
                  type="email"
                  className={inp}
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@company.com"
                />
              </Field>

              <div className="md:col-span-2 rounded-xl bg-neutral-50 p-3 text-xs text-brand-muted flex items-center gap-2 border border-brand-border">
                <Info className="h-4 w-4 text-neutral-400 shrink-0" />
                <span>
                  This email is your primary identifier to log into your enterprise dashboard and receive notifications.
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-brand-border pt-4">
              <Button onClick={saveOwnerProfile} className="rounded-full px-6 font-bold flex items-center gap-2">
                <Save className="h-4 w-4" /> Save Profile Details
              </Button>
            </div>
          </Card>

          {/* Change Password Card */}
          <Card>
            <div className="border-b border-brand-border pb-4 mb-4">
              <h2 className="text-base font-black text-brand-black flex items-center gap-2">
                <Key className="h-4 w-4 text-brand-red" />
                <span>Change Account Password</span>
              </h2>
              <p className="text-xs text-brand-muted">
                Ensure your workspace remains secure by setting a strong, unique password.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Current Password *">
                <input
                  type="password"
                  className={inp}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </Field>

              <Field label="New Password (min 6 chars) *">
                <input
                  type="password"
                  className={inp}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Field>

              <Field label="Confirm New Password *">
                <input
                  type="password"
                  className={inp}
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>
            </div>

            <div className="mt-5 flex justify-end border-t border-brand-border pt-4">
              <Button 
                onClick={saveOwnerPassword} 
                disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                variant="dark"
                className="rounded-full px-6 font-bold flex items-center gap-2"
              >
                <Lock className="h-4 w-4 text-amber-400" /> Update Password
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 1: COMPANY PROFILE */}
      {activeTab === "PROFILE" && co && (
        <div className="space-y-6">
          <Card>
            <div className="border-b border-brand-border pb-4 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-brand-black">Organization Details</h2>
                <p className="text-xs text-brand-muted">Legal identity, GSTIN, and default corporate timezone.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                Active Tenant
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Company Legal Name">
                <input
                  className={inp}
                  disabled={!can(me, "company:edit")}
                  value={co.name ?? ""}
                  onChange={(e) => setCo({ ...co, name: e.target.value })}
                  placeholder="Apex Technologies Pvt Ltd"
                />
              </Field>

              <Field label="GSTIN / Corporate Tax ID">
                <input
                  className={inp}
                  disabled={!can(me, "company:edit")}
                  value={co.gstin ?? ""}
                  onChange={(e) => setCo({ ...co, gstin: e.target.value })}
                  placeholder="07AAAAA0000A1Z5"
                />
              </Field>

              <Field label="Official Contact Phone">
                <input
                  className={inp}
                  disabled={!can(me, "company:edit")}
                  value={co.phone ?? ""}
                  onChange={(e) => setCo({ ...co, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </Field>

              <Field label="System Timezone">
                <select
                  className={inp}
                  disabled={!can(me, "company:edit")}
                  value={co.timezone ?? "Asia/Kolkata"}
                  onChange={(e) => setCo({ ...co, timezone: e.target.value })}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30) - India</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00) - UAE</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT +8:00) - Singapore</option>
                  <option value="Pacific/Auckland">Pacific/Auckland (NZDT +13:00) - New Zealand</option>
                  <option value="Europe/London">Europe/London (GMT +0:00) - UK</option>
                  <option value="America/New_York">America/New_York (EST -5:00) - USA</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Registered Headquarter Address">
                  <textarea
                    rows={2}
                    className={inp}
                    disabled={!can(me, "company:edit")}
                    value={co.address ?? ""}
                    onChange={(e) => setCo({ ...co, address: e.target.value })}
                    placeholder="Floor 4, Tower B, Connaught Place, New Delhi 110001"
                  />
                </Field>
              </div>
            </div>

            {can(me, "company:edit") && (
              <div className="mt-5 flex justify-end border-t border-brand-border pt-4">
                <Button onClick={saveCompany} className="rounded-full px-6 font-bold flex items-center gap-2">
                  <Save className="h-4 w-4" /> Save Company Profile
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
              Cryptographic Tenant Identifiers
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-brand-border">
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Tenant UUID:</span>
                <span className="font-mono text-brand-black font-bold break-all">{co.tenantId}</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-brand-border">
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Account Creation Date:</span>
                <span className="font-semibold text-brand-black">{new Date(co.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS */}
      {activeTab === "ROLES" && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-brand-border pb-4 mb-4 gap-3">
              <div>
                <h2 className="text-base font-black text-brand-black">Configured Roles Matrix</h2>
                <p className="text-xs text-brand-muted">
                  System roles have default locked access; custom roles allow customized permissions.
                </p>
              </div>

              {can(me, "role:create") && (
                <Button 
                  onClick={() => setRole({ name: "", permissions: [] })}
                  className="rounded-full px-5 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" /> Create Custom Role
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {roles.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-brand-border bg-neutral-50/60 p-4 transition hover:bg-neutral-50 gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-brand-black">{r.name}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        r.isSystem ? "bg-neutral-200 text-neutral-700" : "bg-red-50 text-brand-red border border-red-200"
                      }`}>
                        {r.isSystem ? "System Built-in" : "Custom Role"}
                      </span>
                    </div>
                    <p className="text-xs text-brand-muted">
                      Grants <strong>{r.permissions.length}</strong> permissions across platform modules
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!r.isSystem ? (
                      <>
                        {can(me, "role:edit") && (
                          <button
                            onClick={() => setRole(r)}
                            className="rounded-lg border border-brand-border bg-white px-3 py-1.5 text-xs font-bold text-brand-black hover:bg-neutral-100 flex items-center gap-1"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                        {can(me, "role:delete") && (
                          <button
                            onClick={() => deleteRole(r)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-red hover:bg-red-50 flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> System Protected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: USERS & SCOPED ACCESS */}
      {activeTab === "USERS" && (
        <Card>
          <div className="border-b border-brand-border pb-4 mb-4">
            <h2 className="text-base font-black text-brand-black">User Directory & Location Scoping</h2>
            <p className="text-xs text-brand-muted">
              Assign roles and enforce physical branch and department boundaries for every system user.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-border text-neutral-500 font-bold uppercase tracking-wider bg-neutral-50/70">
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Branch Scope Restriction</th>
                  <th className="py-3 px-3">Department Restriction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-50/40">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-brand-black">{u.name}</div>
                      <div className="text-[11px] text-brand-muted">{u.email}</div>
                    </td>

                    <td className="py-3.5 px-3 min-w-[160px]">
                      <select
                        className={inp}
                        disabled={!can(me, "role:manage")}
                        value={u.roleIds[0] ?? ""}
                        onChange={(e) => setAccess(u, { roleIds: [e.target.value] })}
                      >
                        {!u.roleIds.length && <option value="">— Assign Role —</option>}
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3.5 px-3 min-w-[180px]">
                      <select
                        className={inp}
                        disabled={!can(me, "role:manage")}
                        value={u.branchId ?? ""}
                        onChange={(e) => setAccess(u, { branchId: e.target.value || undefined })}
                      >
                        <option value="">All Branches (Unrestricted Access)</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            📍 {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3.5 px-3 min-w-[180px]">
                      <select
                        className={inp}
                        disabled={!can(me, "role:manage")}
                        value={u.departmentId ?? ""}
                        onChange={(e) => setAccess(u, { departmentId: e.target.value || undefined })}
                      >
                        <option value="">All Departments (Unrestricted)</option>
                        {depts.map((d) => (
                          <option key={d.id} value={d.id}>
                            🏢 {d.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: FACE AI & BIOMETRICS */}
      {activeTab === "BIOMETRICS" && (
        <div className="space-y-6">
          <Card>
            <div className="border-b border-brand-border pb-4 mb-4">
              <h2 className="text-base font-black text-brand-black">In-Browser Face AI & Anti-Spoofing</h2>
              <p className="text-xs text-brand-muted">
                Configure biometric matching thresholds, 3D liveness challenges, and geofence verification.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-brand-black uppercase">
                  3D Anti-Spoof Liveness Mode
                </label>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {[
                    { id: "RANDOM_CHALLENGE", title: "Random Challenge (Recommended)", desc: "Dynamically challenges user with blink or head turn" },
                    { id: "BLINK_ONLY", title: "Blink Verification", desc: "Sub-second verification detecting eye aspect ratio blink" },
                    { id: "HEAD_TURN", title: "Head Rotation", desc: "Verifies 3D facial pitch and yaw rotation" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setLivenessMode(mode.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        livenessMode === mode.id
                          ? "border-brand-red bg-red-50/40 shadow-xs"
                          : "border-brand-border bg-white hover:border-neutral-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-brand-black">{mode.title}</span>
                        {livenessMode === mode.id && <Check className="h-4 w-4 text-brand-red" />}
                      </div>
                      <p className="mt-1 text-[11px] text-neutral-500">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-brand-black uppercase">
                  Face Similarity Threshold (Euclidean Distance): {bioThreshold}
                </label>
                <p className="text-[11px] text-brand-muted mb-2">
                  Lower values require stricter facial vector matching. Standard is 0.45.
                </p>
                <input
                  type="range"
                  min="0.25"
                  max="0.65"
                  step="0.05"
                  value={bioThreshold}
                  onChange={(e) => setBioThreshold(e.target.value)}
                  className="w-full accent-brand-red cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono mt-1">
                  <span>0.25 (Ultra Strict)</span>
                  <span className="text-brand-red font-bold">0.45 (Standard Recommended)</span>
                  <span>0.65 (Relaxed)</span>
                </div>
              </div>

              <div className="rounded-2xl bg-neutral-50 p-4 border border-brand-border flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-brand-black flex items-center gap-2">
                    <span>Allow Employees to Self-Register Face Biometrics</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${allowSelfEnroll ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {allowSelfEnroll ? "Self-Enroll Allowed" : "Locked: Admin / HR Only (Recommended)"}
                    </span>
                  </h4>
                  <p className="text-[11px] text-brand-muted mt-0.5">
                    When OFF (Default & Recommended), employees cannot register or alter their facial template from their personal devices. Only Admins and HR can scan and enroll faces from the Employees Directory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const nextVal = !allowSelfEnroll;
                    setAllowSelfEnroll(nextVal);
                    try {
                      await api("/face/policy", { method: "PUT", body: JSON.stringify({ allowSelfEnroll: nextVal }) });
                      setMsg(nextVal ? "Self-face registration enabled for employees" : "Self-face registration locked (Admin / HR only)");
                      setMsgType("success");
                    } catch (e: any) {
                      setAllowSelfEnroll(!nextVal);
                      setMsg(e.message || "Failed to update face policy");
                      setMsgType("error");
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    allowSelfEnroll ? "bg-brand-red" : "bg-neutral-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    allowSelfEnroll ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>

              <div className="rounded-2xl bg-neutral-50 p-4 border border-brand-border flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-brand-black">Strict GPS Branch Geofence Check</h4>
                  <p className="text-[11px] text-brand-muted">
                    Blocks facial punch attempts if employee device is outside the designated branch radius.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGeofenceEnforced(!geofenceEnforced)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    geofenceEnforced ? "bg-brand-red" : "bg-neutral-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    geofenceEnforced ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            </div>
          </Card>

          <Card className="bg-neutral-900 text-white">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-red mb-3">
              Biometric Vault Security Policy
            </h3>
            <div className="space-y-2 text-xs text-neutral-300">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <strong>Zero Raw Photo Retention:</strong> Camera frames are converted to mathematical descriptors and discarded immediately.
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <strong>AES-256-GCM Vector Encryption:</strong> Vector embeddings are encrypted at rest using individual tenant keys.
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <strong>DPDP Act 2023 Compliant:</strong> Employee explicit consent timestamp is recorded prior to facial enrollment.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: SHIFT & ATTENDANCE RULES */}
      {activeTab === "SHIFTS" && (
        <Card>
          <div className="border-b border-brand-border pb-4 mb-4">
            <h2 className="text-base font-black text-brand-black">Shift Rostering & Work Date Policy</h2>
            <p className="text-xs text-brand-muted">
              Configure grace periods, night-shift cross-midnight cutoff, and overtime computation logic.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Field label="Late Entry Grace Period (Minutes)">
                <input
                  type="number"
                  min="0"
                  max="60"
                  className={inp}
                  value={lateGraceMinutes}
                  onChange={(e) => setLateGraceMinutes(Number(e.target.value))}
                />
              </Field>
              <p className="text-[10px] text-neutral-400 mt-1">Arrivals within 15 minutes of shift start are marked on-time.</p>
            </div>

            <div>
              <Field label="Night Shift Safe Work Date Cutoff Window">
                <input
                  type="text"
                  className={inp}
                  value={safeWorkDateCutoff}
                  onChange={(e) => setSafeWorkDateCutoff(e.target.value)}
                  placeholder="08:00"
                />
              </Field>
              <p className="text-[10px] text-neutral-400 mt-1">Punches crossing midnight up to 08:00 AM attribute to the preceding day's shift.</p>
            </div>

            <div>
              <Field label="Overtime Calculation Rate Multiplier">
                <select
                  className={inp}
                  value={otRate}
                  onChange={(e) => setOtRate(e.target.value)}
                >
                  <option value="1.0">1.0x (Standard Hourly Wage)</option>
                  <option value="1.5">1.5x (150% Overtime Rate)</option>
                  <option value="2.0">2.0x (Double Hourly Wage)</option>
                </select>
              </Field>
              <p className="text-[10px] text-neutral-400 mt-1">Applied automatically when staff work past scheduled shift end.</p>
            </div>

            <div>
              <Field label="Colleague Shift Swap Policy">
                <select
                  className={inp}
                  value={shiftSwapPolicy}
                  onChange={(e) => setShiftSwapPolicy(e.target.value)}
                >
                  <option value="SUPERVISOR_APPROVAL">Colleague Accepts + Supervisor Approves</option>
                  <option value="AUTO_ON_PEER_ACCEPT">Auto-Approved Once Colleague Accepts</option>
                  <option value="DISABLED">Shift Swapping Disabled</option>
                </select>
              </Field>
              <p className="text-[10px] text-neutral-400 mt-1">Controls workflow when two employees initiate an emergency roster swap.</p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 6: PAYROLL & STATUTORY */}
      {activeTab === "PAYROLL" && (
        <div className="space-y-6">
          <Card>
            <div className="border-b border-brand-border pb-4 mb-4">
              <h2 className="text-base font-black text-brand-black">Statutory Deduction Rules</h2>
              <p className="text-xs text-brand-muted">
                Statutory deductions are computed using integer-paise precision to prevent rounding errors.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-brand-border space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-brand-black">Employees' Provident Fund (PF)</h4>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">12% Stat</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Deducted at 12% of basic wages up to statutory wage ceiling of ₹15,000/month.
                </p>
                <div className="pt-2 text-xs font-mono text-neutral-600">
                  <span>Employer Share: 12% (3.67% EPF + 8.33% EPS)</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-brand-border space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-brand-black">Employee State Insurance (ESI)</h4>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">0.75% Stat</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Applicable for employees with gross salary up to ₹21,000/month.
                </p>
                <div className="pt-2 text-xs font-mono text-neutral-600">
                  <span>Employer Contribution: 3.25%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 7: NOTIFICATIONS & ALERTS */}
      {activeTab === "NOTIFICATIONS" && (
        <Card>
          <div className="border-b border-brand-border pb-4 mb-4">
            <h2 className="text-base font-black text-brand-black">Automated Alerts & Delivery</h2>
            <p className="text-xs text-brand-muted">
              Configure communication channels for punch notifications, salary slips, and attendance digests.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-brand-border bg-neutral-50/50">
              <div>
                <h4 className="text-xs font-bold text-brand-black">WhatsApp Punch Confirmation</h4>
                <p className="text-[11px] text-neutral-500">Sends instant WhatsApp notification to staff upon successful face punch.</p>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappAlerts(!whatsappAlerts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  whatsappAlerts ? "bg-brand-red" : "bg-neutral-300"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  whatsappAlerts ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-brand-border bg-neutral-50/50">
              <div>
                <h4 className="text-xs font-bold text-brand-black">Auto-Email PDF Payslip to Employees</h4>
                <p className="text-[11px] text-neutral-500">Dispatches password-protected PDF payslips when monthly payroll is approved and locked.</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoEmailPayslip(!autoEmailPayslip)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoEmailPayslip ? "bg-brand-red" : "bg-neutral-300"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoEmailPayslip ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* CREATE / EDIT CUSTOM ROLE MODAL */}
      {role && (
        <Modal title={role.id ? `Edit Role: ${role.name}` : "Create New Custom Role"} onClose={() => setRole(null)}>
          <div className="space-y-4">
            <Field label="Role Name">
              <input
                className={inp}
                placeholder="e.g. Regional HR Supervisor"
                value={role.name}
                onChange={(e) => setRole({ ...role, name: e.target.value })}
              />
            </Field>

            <div className="border-t border-brand-border pt-3">
              <h4 className="text-xs font-bold text-brand-black uppercase mb-2">Granular Permissions Matrix</h4>
              <p className="text-[11px] text-brand-muted mb-3">
                Check the modules and actions this role can perform. You can only grant permissions you possess yourself.
              </p>

              <div className="max-h-72 overflow-auto border border-brand-border rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-100 text-brand-black sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left">Module</th>
                      {acts.map((a) => (
                        <th key={a} className="py-2 px-2 text-center capitalize">
                          {a}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {mods.map((m) => (
                      <tr key={m} className="hover:bg-neutral-50">
                        <td className="py-2 px-3 font-bold text-brand-black capitalize">{m}</td>
                        {acts.map((a) => {
                          const code = `${m}:${a}`;
                          const isAssigned = role.permissions.includes(code);
                          const canGrant = me.perms.includes(code);

                          return (
                            <td key={a} className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                disabled={!canGrant}
                                checked={isAssigned}
                                onChange={(e) =>
                                  setRole({
                                    ...role,
                                    permissions: e.target.checked
                                      ? [...role.permissions, code]
                                      : role.permissions.filter((x: string) => x !== code),
                                  })
                                }
                                className="accent-brand-red cursor-pointer"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-brand-border">
              <Button variant="outline" onClick={() => setRole(null)}>
                Cancel
              </Button>
              <Button onClick={saveRole} disabled={role.name.trim().length < 2} className="font-bold">
                Save Role
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
