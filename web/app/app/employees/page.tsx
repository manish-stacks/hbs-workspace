"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Camera, 
  ShieldCheck, 
  KeyRound, 
  Key, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Briefcase, 
  MapPin, 
  Calendar, 
  Clock,
  Lock, 
  Eye, 
  EyeOff, 
  Trash2, 
  ArrowRightLeft, 
  Sparkles, 
  Phone, 
  Mail, 
  Check, 
  X,
  Edit2,
  ScanFace,
  ChevronRight,
  UserCheck,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { Field, inp } from "@/components/ui/modal";
import { can, useMe } from "@/components/me";
import { api, download } from "@/lib/api";
import { parseCsv } from "@/lib/csv";
import { FaceCapture } from "@/components/face-capture";
import { SalaryModal } from "@/components/salary-modal";

const fmtMinutes = (m?: number | null) => {
  if (m == null) return "00:00";
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// Form Schema
const schema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").or(z.literal("")),
  mobile: z.string().regex(/^[0-9+\- ]{7,15}$/, "Invalid mobile number").or(z.literal("")),
  dob: z.string(),
  gender: z.string(),
  joiningDate: z.string().min(1, "Joining date is required"),
  employmentType: z.string(),
  designationId: z.string(),
  departmentId: z.string(),
  branchId: z.string(),
  shiftId: z.string().optional(),
  address: z.string(),
  emergencyContact: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  ifsc: z.string(),
  createLogin: z.boolean().optional()
});

type FormValues = z.infer<typeof schema>;

const blankForm: FormValues = {
  fullName: "",
  email: "",
  mobile: "",
  dob: "",
  gender: "",
  joiningDate: "",
  employmentType: "FULL_TIME",
  designationId: "",
  departmentId: "",
  branchId: "",
  shiftId: "",
  address: "",
  emergencyContact: "",
  bankName: "",
  accountNumber: "",
  ifsc: ""
};

const cleanObj = (o: any) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined));

// --- Employee Form Component (Add / Edit) ---
function EmployeeForm({
  emp,
  lists,
  onDone,
  onCancel
}: {
  emp?: any;
  lists: any;
  onDone: (msg?: string) => void;
  onCancel: () => void;
}) {
  const init = emp
    ? {
        ...blankForm,
        ...Object.fromEntries(
          Object.keys(blankForm).map((k) => [k, emp[k] ?? emp.bank?.[k] ?? ""])
        ),
        shiftId: emp.shiftAssignments?.[0]?.shiftId ?? "",
        dob: emp.dob?.slice(0, 10) ?? "",
        joiningDate: emp.joiningDate?.slice(0, 10) ?? ""
      }
    : blankForm;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: init
  });

  const [err, setErr] = useState("");

  const save = async (d: FormValues) => {
    try {
      setErr("");
      const body: any = cleanObj(d);
      if (emp) {
        delete body.branchId;
        delete body.createLogin;
      }
      const r = await api<any>(emp ? `/employees/${emp.id}` : "/employees", {
        method: emp ? "PATCH" : "POST",
        body: JSON.stringify(body)
      });
      onDone(
        r.tempPassword
          ? `Employee created! Temporary login password: ${r.tempPassword}`
          : `Employee ${emp ? "updated" : "created"} successfully.`
      );
    } catch (e: any) {
      setErr(String(e.message || "Failed to save employee"));
    }
  };

  const sel = (n: keyof FormValues, items: any[]) => (
    <select className={inp} {...register(n as any)}>
      <option value="">— Select —</option>
      {items.map((i) => (
        <option key={i.id} value={i.id}>
          {i.name}
        </option>
      ))}
    </select>
  );

  return (
    <form onSubmit={handleSubmit(save)} className="space-y-6">
      {err && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{err}</span>
        </div>
      )}

      {/* Personal Details */}
      <div className="rounded-2xl border border-brand-border bg-neutral-50/60 p-4 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-brand-black flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-red" /> Personal Information
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Full Name *" error={errors.fullName?.message}>
            <input className={inp} placeholder="e.g. Rahul Sharma" {...register("fullName")} />
          </Field>
          <Field label="Email Address" error={errors.email?.message}>
            <input className={inp} type="email" placeholder="rahul@company.com" {...register("email")} />
          </Field>
          <Field label="Mobile Phone" error={errors.mobile?.message}>
            <input className={inp} placeholder="+91 98765 43210" {...register("mobile")} />
          </Field>
          <Field label="Date of Birth">
            <input type="date" className={inp} {...register("dob")} />
          </Field>
          <Field label="Gender">
            <select className={inp} {...register("gender")}>
              <option value="">— Select Gender —</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Emergency Contact">
            <input className={inp} placeholder="Name & Phone" {...register("emergencyContact")} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Residential Address">
              <input className={inp} placeholder="Street, City, Pincode" {...register("address")} />
            </Field>
          </div>
        </div>
      </div>

      {/* Organization & Assignment */}
      <div className="rounded-2xl border border-brand-border bg-neutral-50/60 p-4 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-brand-black flex items-center gap-2">
          <Building2 className="h-4 w-4 text-brand-red" /> Organization & Position
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Joining Date *" error={errors.joiningDate?.message}>
            <input type="date" className={inp} {...register("joiningDate")} />
          </Field>
          <Field label="Employment Type">
            <select className={inp} {...register("employmentType")}>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
            </select>
          </Field>
          <Field label="Branch Office">
            {!emp ? (
              sel("branchId", lists.branches)
            ) : (
              <input
                className={`${inp} bg-neutral-100 text-neutral-500 cursor-not-allowed`}
                disabled
                value={emp.branch?.name ?? "Assigned Branch"}
              />
            )}
          </Field>
          <Field label="Department">{sel("departmentId", lists.departments)}</Field>
          <div>
            <Field label="Designation / Role">{sel("designationId", lists.designations)}</Field>
          </div>
          <div>
            <Field label="Work Shift Schedule">
              <select className={inp} {...register("shiftId")}>
                <option value="">— Select Shift (or leave unassigned) —</option>
                {lists.shifts?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({fmtMinutes(s.startMinute)} - {fmtMinutes(s.endMinute)}) · {s.type}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* Bank & Statutory Details */}
      <div className="rounded-2xl border border-brand-border bg-neutral-50/60 p-4 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-brand-black flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-brand-red" /> Bank & Salary Disbursement
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Bank Name">
            <input className={inp} placeholder="e.g. HDFC Bank" {...register("bankName")} />
          </Field>
          <Field label="Account Number">
            <input className={inp} placeholder="Account #" {...register("accountNumber")} />
          </Field>
          <Field label="IFSC Code">
            <input className={inp} placeholder="e.g. HDFC0001234" {...register("ifsc")} />
          </Field>
        </div>
      </div>

      {/* Login Provisioning */}
      {!emp && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              {...register("createLogin")}
            />
            <div>
              <span className="text-xs font-black text-neutral-900 block">
                Provision Employee Self-Service Portal Login
              </span>
              <p className="text-[11px] text-neutral-600 mt-0.5">
                Automatically creates login credentials with the provided email. A secure temporary password will be generated for the employee.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Form Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : emp ? "Save Changes" : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}

// --- Face Biometric Enrollment / Update Modal ---
function FaceEnrollModal({
  emp,
  onClose,
  onSuccess
}: {
  emp: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [scanning, setScanning] = useState(!emp.faceTemplate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFaceResult = async (r: { descriptor: number[]; challengeId: string }) => {
    setLoading(true);
    setError("");
    try {
      await api("/face/enroll", {
        method: "POST",
        body: JSON.stringify({
          employeeId: emp.id,
          descriptor: r.descriptor,
          challengeId: r.challengeId,
          consent: true,
          liveness: true
        })
      });
      onSuccess(`Face biometrics updated successfully for ${emp.fullName}! They can now punch in/out using Face AI.`);
    } catch (err: any) {
      setError(err.message || "Failed to register face biometrics");
      setScanning(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFace = async () => {
    if (
      !confirm(
        `Are you sure you want to remove enrolled face biometrics for ${emp.fullName}? They will no longer be able to punch with Face AI until re-enrolled.`
      )
    )
      return;

    setLoading(true);
    setError("");
    try {
      await api(`/face/${emp.id}`, { method: "DELETE" });
      onSuccess(`Face biometrics removed for ${emp.fullName}.`);
    } catch (err: any) {
      setError(err.message || "Failed to delete face biometrics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Employee Quick Banner */}
      <div className="flex items-center gap-3.5 rounded-2xl bg-neutral-900 p-4 text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-red to-rose-600 font-black text-white text-base">
          {emp.fullName?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-white">{emp.fullName}</h3>
            <span className="font-mono text-xs rounded bg-neutral-800 px-2 py-0.5 text-neutral-300">
              {emp.employeeCode}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            {emp.designation?.name || "Staff"} · {emp.branch?.name || "All Branches"}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="py-8 text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-red" />
          <p className="text-xs font-bold text-brand-muted">Saving 3D Biometric Face Embeddings to Vault...</p>
        </div>
      )}

      {!loading && !scanning && (
        <div className="space-y-4">
          {emp.faceTemplate ? (
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-5 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h4 className="text-sm font-black text-neutral-900">
                Face Biometrics Currently Active
              </h4>
              <p className="text-xs text-neutral-600 max-w-md mx-auto">
                {emp.fullName} is registered and verified for AI Face Attendance. They can punch in and out at tablet kiosks or their employee device.
              </p>
              {emp.faceTemplate.consentAt && (
                <p className="text-[11px] text-neutral-400">
                  Last enrolled on: {new Date(emp.faceTemplate.consentAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-5 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertCircle className="h-7 w-7 text-amber-600" />
              </div>
              <h4 className="text-sm font-black text-neutral-900">
                No Biometrics Registered Yet
              </h4>
              <p className="text-xs text-neutral-600 max-w-md mx-auto">
                Scan employee face via your webcam to enable 3D AI face matching, anti-spoof liveness, and instant gate punch in/out.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
            {emp.faceTemplate && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto text-xs"
                onClick={handleRemoveFace}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove Face Template
              </Button>
            )}
            <Button
              variant="primary"
              className="w-full sm:w-auto text-xs font-bold"
              onClick={() => setScanning(true)}
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              {emp.faceTemplate ? "Scan & Update Face" : "Start Face Registration"}
            </Button>
          </div>
        </div>
      )}

      {!loading && scanning && (
        <div className="rounded-3xl border border-brand-border bg-white p-3 shadow-xs">
          <FaceCapture
            onResult={handleFaceResult}
            onCancel={() => setScanning(false)}
          />
        </div>
      )}
    </div>
  );
}

// --- Password Reset / Change Modal ---
function PasswordModal({
  emp,
  onClose,
  onSuccess
}: {
  emp: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let p = "";
    for (let i = 0; i < 10; i++) {
      p += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(p);
    setConfirmPassword(p);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api(`/employees/${emp.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password })
      });
      onSuccess(`Password updated successfully for ${emp.fullName}! They can now log in with this password.`);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Employee Quick Info */}
      <div className="flex items-center gap-3.5 rounded-2xl bg-neutral-900 p-4 text-white">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-red to-rose-600 font-black text-white text-sm">
          {emp.fullName?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-white">{emp.fullName}</h3>
            <span className="font-mono text-[11px] rounded bg-neutral-800 px-2 py-0.5 text-neutral-300">
              {emp.employeeCode}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1.5">
            <Mail className="h-3 w-3 text-neutral-500" />
            {emp.email || "No email assigned"}
          </p>
        </div>
      </div>

      {!emp.email && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>This employee does not have an email address yet. Please add an email address first to enable login.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-2xl border border-brand-border bg-neutral-50/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-brand-black">Set New Password</label>
          <button
            type="button"
            onClick={generatePassword}
            className="text-xs font-bold text-brand-red hover:underline flex items-center gap-1"
          >
            <Sparkles className="h-3.5 w-3.5" /> Generate Random
          </button>
        </div>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className={`${inp} pr-10 font-mono`}
            placeholder="Enter at least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-brand-black block mb-1">Confirm Password</label>
          <input
            type={showPassword ? "text" : "password"}
            className={`${inp} font-mono`}
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <p className="text-[11px] text-neutral-500">
          Employee will use this password alongside their email (<strong>{emp.email || "assigned email"}</strong>) to access the Self-Service Portal and mobile apps.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border">
        <Button variant="outline" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={loading || !emp.email}>
          {loading ? "Updating..." : "Save Password"}
        </Button>
      </div>
    </form>
  );
}

// --- Transfer Modal Component ---
function TransferModal({
  emp,
  lists,
  onClose,
  onDone
}: {
  emp: any;
  lists: any;
  onClose: () => void;
  onDone: (msg?: string) => void;
}) {
  const [b, setB] = useState("");
  const [d, setD] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const go = async () => {
    setLoading(true);
    setErr("");
    try {
      await api(`/employees/${emp.id}/transfer`, {
        method: "POST",
        body: JSON.stringify(cleanObj({ branchId: b, departmentId: d }))
      });
      onDone(`Employee transferred successfully to new branch/department.`);
    } catch (e: any) {
      setErr(e.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl bg-neutral-900 p-3.5 text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 font-bold text-sm">
          {emp.fullName?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 className="font-bold text-sm">{emp.fullName}</h3>
          <p className="text-xs text-neutral-400">
            Current: {emp.branch?.name || "No Branch"} · {emp.department?.name || "No Department"}
          </p>
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{err}</span>
        </div>
      )}

      <div className="space-y-3">
        <Field label="New Branch Location">
          <select className={inp} value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">(Keep Current Branch)</option>
            {lists.branches.map((x: any) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="New Department">
          <select className={inp} value={d} onChange={(e) => setD(e.target.value)}>
            <option value="">(Keep Current Department)</option>
            {lists.departments.map((x: any) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={go} disabled={(!b && !d) || loading}>
          {loading ? "Transferring..." : "Confirm Transfer"}
        </Button>
      </div>
    </div>
  );
}

// --- Quick Shift Assignment Modal ---
function QuickShiftModal({
  emp,
  shifts,
  onClose,
  onSuccess
}: {
  emp: any;
  shifts: any[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const currentShiftId = emp.shiftAssignments?.[0]?.shiftId ?? "";
  const [shiftId, setShiftId] = useState(currentShiftId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api(`/employees/${emp.id}`, {
        method: "PATCH",
        body: JSON.stringify({ shiftId })
      });
      const chosen = shifts.find((s) => s.id === shiftId);
      onSuccess(
        chosen
          ? `Shift updated to "${chosen.name}" (${fmtMinutes(chosen.startMinute)} - ${fmtMinutes(chosen.endMinute)}) for ${emp.fullName}!`
          : `Shift unassigned for ${emp.fullName}.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to update shift schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Employee Quick Banner */}
      <div className="flex items-center gap-3.5 rounded-2xl bg-neutral-900 p-4 text-white">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 font-black text-white text-sm">
          {emp.fullName?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-white">{emp.fullName}</h3>
            <span className="font-mono text-[11px] rounded bg-neutral-800 px-2 py-0.5 text-neutral-300">
              {emp.employeeCode}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            {emp.designation?.name || "Staff"} · {emp.branch?.name || "Headquarters"}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-2xl border border-brand-border bg-neutral-50/60 p-4 space-y-3">
        <label className="text-xs font-bold text-brand-black block">
          Select Working Shift Schedule
        </label>
        <select
          className={inp}
          value={shiftId}
          onChange={(e) => setShiftId(e.target.value)}
        >
          <option value="">— Unassigned (No Fixed Shift) —</option>
          {shifts.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name} ({fmtMinutes(s.startMinute)} - {fmtMinutes(s.endMinute)}) · {s.type}
            </option>
          ))}
        </select>

        <p className="text-[11px] text-neutral-500 leading-relaxed">
          Assigned shift determines the employee's work date window, daily punch-in timing, grace periods, rotational rosters, and overtime calculations.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border">
        <Button variant="outline" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? "Assigning..." : "Save Shift Assignment"}
        </Button>
      </div>
    </form>
  );
}

// --- Main Employees Directory Page ---
export default function EmployeesPage() {
  const me = useMe();
  const fileRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<any>(null);
  const [lists, setLists] = useState<any>({ branches: [], departments: [], designations: [], shifts: [] });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [branchId, setBranchId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [faceFilter, setFaceFilter] = useState(""); // "enrolled" | "not_enrolled" | ""
  const [sort, setSort] = useState("createdAt");

  // Active Modals
  const [formModal, setFormModal] = useState<any>(null); // { type: 'create' | 'edit', emp?: any }
  const [faceModal, setFaceModal] = useState<any>(null); // employee object
  const [passwordModal, setPasswordModal] = useState<any>(null); // employee object
  const [transferModal, setTransferModal] = useState<any>(null); // employee object
  const [quickShiftModal, setQuickShiftModal] = useState<any>(null); // employee object
  const [salaryModalEmp, setSalaryModalEmp] = useState<any>(null); // employee object

  // Notification Toast
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(""), 7000);
  };

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({
      page: String(page),
      pageSize: "15",
      sort,
      ...(q && { q }),
      ...(branchId && { branchId }),
      ...(deptId && { departmentId: deptId }),
      ...(shiftFilter && { shiftId: shiftFilter })
    });

    api<any>("/employees?" + p)
      .then((res) => {
        setData(res);
      })
      .catch((e) => showNotification(e.message, "error"))
      .finally(() => setLoading(false));
  }, [page, q, branchId, deptId, shiftFilter, sort]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    Promise.all([
      api<any[]>("/branches").catch(() => []),
      api<any[]>("/departments").catch(() => []),
      api<any[]>("/designations").catch(() => []),
      api<any[]>("/shifts").catch(() => [])
    ]).then(([branches, departments, designations, shifts]) => {
      setLists({ branches, departments, designations, shifts });
    });
  }, []);

  const archive = async (e: any) => {
    if (confirm(`Archive employee ${e.fullName}? Their login access will be disabled and face biometric template purged.`)) {
      try {
        await api(`/employees/${e.id}/archive`, { method: "POST" });
        showNotification(`Employee ${e.fullName} has been archived.`);
        load();
      } catch (err: any) {
        showNotification(err.message || "Failed to archive employee", "error");
      }
    }
  };

  const doImport = async (f: File) => {
    try {
      const rows = parseCsv(await f.text());
      const r = await api<any>("/employees/import", {
        method: "POST",
        body: JSON.stringify({ rows })
      });
      showNotification(
        `Imported ${r.created} employees successfully! ${
          r.errors.length ? `Errors in ${r.errors.length} rows.` : ""
        }`
      );
      load();
    } catch (e: any) {
      showNotification(e.message, "error");
    }
  };

  // Filter items in memory if faceFilter is selected
  const displayItems = (data?.items || []).filter((emp: any) => {
    if (faceFilter === "enrolled") return !!emp.faceTemplate;
    if (faceFilter === "not_enrolled") return !emp.faceTemplate;
    return true;
  });

  const totalEmployees = data?.total ?? 0;
  const faceEnrolledCount = data?.faceEnrolledCount ?? 0;
  const faceEnrolledPercent = totalEmployees > 0 ? Math.round((faceEnrolledCount / totalEmployees) * 100) : 0;
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-8 font-sans antialiased text-brand-text">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-red px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              Workforce Operations
            </span>
            <span className="text-xs font-semibold text-brand-muted">
              Live Biometrics & Identity Roster
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-brand-black sm:text-3xl">
            Employees & Face Biometrics
          </h1>
          <p className="mt-1 text-xs text-brand-muted">
            Manage employee directory, enroll 3D face templates for AI punch attendance, update credentials, and transfer branches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {can(me, "employee:export") && (
            <Button
              variant="outline"
              className="text-xs font-bold rounded-full px-3.5"
              onClick={() => download("/employees/export", "employees.csv")}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
            </Button>
          )}

          {can(me, "employee:create") && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
              />
              <Button
                variant="outline"
                className="text-xs font-bold rounded-full px-3.5"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Import CSV
              </Button>

              <Button
                variant="primary"
                className="text-xs font-bold rounded-full px-4 shadow-md shadow-red-500/20"
                onClick={() => setFormModal({ type: "create" })}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> + Add Employee
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      {msg && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl p-4 text-xs font-bold transition shadow-xs ${
            msgType === "success"
              ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {msgType === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{msg}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4 border border-brand-border bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase">Total Employees</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-brand-black">{totalEmployees}</span>
            <span className="text-[11px] font-semibold text-neutral-400">Registered</span>
          </div>
        </Card>

        <Card className="p-4 border border-brand-border bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase">Active Staff</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {data?.totalActive ?? totalEmployees}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">Active Roster</span>
          </div>
        </Card>

        <Card className="p-4 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1">
              <ScanFace className="h-3.5 w-3.5 text-emerald-600" /> Face Enrolled
            </span>
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
              {faceEnrolledPercent}% AI Ready
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-900">{faceEnrolledCount}</span>
            <span className="text-[11px] font-semibold text-neutral-500">of {totalEmployees} enrolled</span>
          </div>
        </Card>

        <Card className="p-4 border border-brand-border bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase">Branch Offices</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-brand-black">{lists.branches.length}</span>
            <span className="text-[11px] font-semibold text-neutral-400">Locations</span>
          </div>
        </Card>
      </div>

      {/* Directory Table Card */}
      <Card className="border border-brand-border bg-white shadow-xs overflow-hidden rounded-3xl">
        {/* Filters Bar - Arranged in One Row */}
        <div className="border-b border-brand-border bg-neutral-50/70 p-3.5">
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-0.5">
            {/* Search Input */}
            <div className="relative min-w-[220px] max-w-xs flex-1 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                className="w-full rounded-full border border-neutral-300 bg-white py-1.5 pl-8 pr-7 text-xs text-brand-black placeholder-neutral-400 outline-none transition focus:border-brand-black focus:ring-1 focus:ring-brand-black"
                placeholder="Search staff, ID, email..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Branch Filter */}
            <select
              className="shrink-0 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 outline-none transition hover:border-neutral-400 focus:border-brand-black cursor-pointer"
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Branches</option>
              {lists.branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              className="shrink-0 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 outline-none transition hover:border-neutral-400 focus:border-brand-black cursor-pointer"
              value={deptId}
              onChange={(e) => {
                setDeptId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Departments</option>
              {lists.departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Shift Filter */}
            <select
              className="shrink-0 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 outline-none transition hover:border-neutral-400 focus:border-brand-black cursor-pointer"
              value={shiftFilter}
              onChange={(e) => {
                setShiftFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Shifts</option>
              {lists.shifts?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  Shift: {s.name} ({fmtMinutes(s.startMinute)} - {fmtMinutes(s.endMinute)})
                </option>
              ))}
              <option value="none">Unassigned</option>
            </select>

            {/* Biometric Status Filter */}
            <select
              className="shrink-0 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 outline-none transition hover:border-neutral-400 focus:border-brand-black cursor-pointer"
              value={faceFilter}
              onChange={(e) => setFaceFilter(e.target.value)}
            >
              <option value="">All Biometrics</option>
              <option value="enrolled">✓ Face Enrolled</option>
              <option value="not_enrolled">⚠ Not Enrolled</option>
            </select>

            {/* Sort Dropdown */}
            <select
              className="shrink-0 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 outline-none transition hover:border-neutral-400 focus:border-brand-black cursor-pointer"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="createdAt">Newest Joined</option>
              <option value="fullName">Name (A-Z)</option>
              <option value="employeeCode">Employee ID</option>
              <option value="joiningDate">Joining Date</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={load}
              title="Refresh Directory"
              className="shrink-0 flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100 hover:border-neutral-400 transition"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-brand-red" : ""}`} />
              <span>Refresh</span>
            </button>

            {/* Clear All Filters Button (Shows only when a filter is applied) */}
            {(q || branchId || deptId || shiftFilter || faceFilter || sort !== "createdAt") && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setBranchId("");
                  setDeptId("");
                  setShiftFilter("");
                  setFaceFilter("");
                  setSort("createdAt");
                  setPage(1);
                }}
                title="Reset all filters"
                className="shrink-0 flex items-center gap-1 rounded-full bg-neutral-200 hover:bg-neutral-300 px-2.5 py-1.5 text-[11px] font-bold text-neutral-700 transition"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Employees Table */}
        {loading && !data ? (
          <div className="p-8 space-y-4">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-border bg-neutral-100/70 font-bold uppercase tracking-wider text-neutral-600">
                  <th className="py-3.5 pl-5 pr-3">Employee</th>
                  <th className="px-3 py-3.5">Employee ID</th>
                  <th className="px-3 py-3.5">Branch & Dept</th>
                  <th className="px-3 py-3.5">Assigned Shift</th>
                  <th className="px-3 py-3.5">Type & Joining</th>
                  <th className="px-3 py-3.5 text-center">Face AI Biometrics</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-neutral-800">
                {displayItems.map((e: any) => {
                  const hasFace = !!e.faceTemplate;
                  return (
                    <tr
                      key={e.id}
                      className="hover:bg-neutral-50/80 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 font-extrabold text-white text-xs shadow-xs">
                            {e.fullName?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-brand-black text-sm group-hover:text-brand-red transition-colors flex items-center gap-1.5">
                              {e.fullName}
                              {e.user && (
                                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600">
                                  Login Active
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-neutral-500 text-[11px] mt-0.5">
                              {e.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-neutral-400" />
                                  {e.email}
                                </span>
                              )}
                              {e.mobile && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-neutral-400" />
                                  {e.mobile}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Employee Code */}
                      <td className="px-3 py-3.5 font-mono font-bold text-neutral-900">
                        <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs border border-neutral-200">
                          {e.employeeCode}
                        </span>
                      </td>

                      {/* Branch & Dept */}
                      <td className="px-3 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                            <MapPin className="h-3.5 w-3.5 text-brand-red shrink-0" />
                            <span>{e.branch?.name ?? "Main Headquarters"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
                            <span>{e.department?.name ?? "General"}</span>
                            <span>·</span>
                            <span className="font-medium text-neutral-700">
                              {e.designation?.name ?? "Staff"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Shift Badge */}
                      <td className="px-3 py-3.5">
                        {e.shiftAssignments?.[0]?.shift ? (
                          <div className="inline-flex flex-col">
                            <button
                              type="button"
                              onClick={() => setQuickShiftModal(e)}
                              title="Click to reassign shift"
                              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                            >
                              <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span>{e.shiftAssignments[0].shift.name}</span>
                            </button>
                            <span className="text-[10px] font-mono text-neutral-500 mt-0.5 pl-1">
                              {fmtMinutes(e.shiftAssignments[0].shift.startMinute)} - {fmtMinutes(e.shiftAssignments[0].shift.endMinute)}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setQuickShiftModal(e)}
                            className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-200 hover:text-black transition cursor-pointer"
                          >
                            <Clock className="h-3 w-3 text-neutral-400" />
                            <span>+ Assign Shift</span>
                          </button>
                        )}
                      </td>

                      {/* Employment Type & Date */}
                      <td className="px-3 py-3.5">
                        <div className="space-y-1">
                          <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-neutral-700">
                            {e.employmentType?.replace("_", " ")}
                          </span>
                          <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-neutral-400" />
                            {new Date(e.joiningDate).toLocaleDateString()}
                          </div>
                        </div>
                      </td>

                      {/* Face Biometric Pill */}
                      <td className="px-3 py-3.5 text-center">
                        {hasFace ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Face Enrolled
                            </span>
                            <span className="text-[10px] text-neutral-400 mt-0.5">
                              Ready for Face AI
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200 shadow-2xs">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                              Not Enrolled
                            </span>
                            <span className="text-[10px] text-neutral-400 mt-0.5">
                              Manual punch only
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Face Update Button */}
                          <button
                            type="button"
                            title={hasFace ? "Update Face Biometrics" : "Register Face Biometrics"}
                            onClick={() => setFaceModal(e)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer ${
                              hasFace
                                ? "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 hover:text-black border border-neutral-300"
                                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
                            }`}
                          >
                            <Camera className="h-3.5 w-3.5" />
                            <span>{hasFace ? "Update Face" : "Enroll Face"}</span>
                          </button>

                          {/* Quick Shift Button */}
                          <button
                            type="button"
                            title="Assign or Change Shift Schedule"
                            onClick={() => setQuickShiftModal(e)}
                            className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 border border-blue-200 transition shadow-xs cursor-pointer"
                          >
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            <span>Shift</span>
                          </button>

                          {/* Salary & CTC Setup Button */}
                          <button
                            type="button"
                            title="Configure or Revise Monthly Salary & CTC"
                            onClick={() => setSalaryModalEmp(e)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition shadow-xs cursor-pointer"
                          >
                            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Salary</span>
                          </button>

                          {/* Password Reset Button */}
                          <button
                            type="button"
                            title="Reset / Set Password"
                            onClick={() => setPasswordModal(e)}
                            className="flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs font-bold text-neutral-800 hover:bg-neutral-200 hover:text-black border border-neutral-300 transition shadow-xs cursor-pointer"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-neutral-600" />
                            <span>Password</span>
                          </button>

                          {/* Edit Details */}
                          {can(me, "employee:edit") && (
                            <button
                              type="button"
                              title="Edit Employee Details"
                              onClick={() => setFormModal({ type: "edit", emp: e })}
                              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-brand-black transition cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Transfer Branch */}
                          {can(me, "employee:manage") && (
                            <button
                              type="button"
                              title="Transfer Branch / Dept"
                              onClick={() => setTransferModal(e)}
                              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-brand-black transition cursor-pointer"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </button>
                          )}

                          {/* Archive Employee */}
                          {can(me, "employee:delete") && (
                            <button
                              type="button"
                              title="Archive Employee"
                              onClick={() => archive(e)}
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!displayItems.length && !loading && (
              <div className="py-16 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-brand-black">No Employees Found</h3>
                <p className="text-xs text-brand-muted max-w-sm mx-auto">
                  No staff members match the selected search query or filters.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-brand-border bg-neutral-50/70 p-4 text-xs font-semibold text-neutral-600">
          <div>
            Showing {displayItems.length} of {totalEmployees} employees
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full px-3 py-1 text-xs"
            >
              Previous
            </Button>
            <span className="px-2">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full px-3 py-1 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* --- Modals --- */}

      {/* Add / Edit Employee Modal */}
      {formModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200">
            <div className="mb-5 flex items-center justify-between border-b border-brand-border pb-3.5">
              <div>
                <h2 className="text-lg font-black text-brand-black">
                  {formModal.type === "edit" ? "Edit Employee Details" : "Add New Employee"}
                </h2>
                <p className="text-xs text-brand-muted mt-0.5">
                  Enter organizational profile, contact details, and bank credentials.
                </p>
              </div>
              <button
                onClick={() => setFormModal(null)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <EmployeeForm
              emp={formModal.emp}
              lists={lists}
              onDone={(m) => {
                setFormModal(null);
                if (m) showNotification(m);
                load();
              }}
              onCancel={() => setFormModal(null)}
            />
          </div>
        </div>
      )}

      {/* Face Enrollment / Update Modal */}
      {faceModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200">
            <div className="mb-4 flex items-center justify-between border-b border-brand-border pb-3.5">
              <div>
                <h2 className="text-base font-black text-brand-black flex items-center gap-2">
                  <ScanFace className="h-5 w-5 text-brand-red" />
                  Face AI Biometrics
                </h2>
                <p className="text-xs text-brand-muted mt-0.5">
                  3D Face registration for instant attendance punch.
                </p>
              </div>
              <button
                onClick={() => setFaceModal(null)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <FaceEnrollModal
              emp={faceModal}
              onClose={() => setFaceModal(null)}
              onSuccess={(m) => {
                setFaceModal(null);
                showNotification(m);
                load();
              }}
            />
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200">
            <div className="mb-4 flex items-center justify-between border-b border-brand-border pb-3.5">
              <div>
                <h2 className="text-base font-black text-brand-black flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-brand-red" />
                  Change Employee Password
                </h2>
                <p className="text-xs text-brand-muted mt-0.5">
                  Update employee login credentials directly as HR or Owner.
                </p>
              </div>
              <button
                onClick={() => setPasswordModal(null)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <PasswordModal
              emp={passwordModal}
              onClose={() => setPasswordModal(null)}
              onSuccess={(m) => {
                setPasswordModal(null);
                showNotification(m);
                load();
              }}
            />
          </div>
        </div>
      )}

      {/* Transfer Branch Modal */}
      {transferModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200">
            <div className="mb-4 flex items-center justify-between border-b border-brand-border pb-3.5">
              <div>
                <h2 className="text-base font-black text-brand-black flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-brand-red" />
                  Transfer Employee Location
                </h2>
                <p className="text-xs text-brand-muted mt-0.5">
                  Reassign staff to a different branch office or department.
                </p>
              </div>
              <button
                onClick={() => setTransferModal(null)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <TransferModal
              emp={transferModal}
              lists={lists}
              onClose={() => setTransferModal(null)}
              onDone={(m) => {
                setTransferModal(null);
                if (m) showNotification(m);
                load();
              }}
            />
          </div>
        </div>
      )}

      {/* Quick Shift Assignment Modal */}
      {quickShiftModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200">
            <div className="mb-4 flex items-center justify-between border-b border-brand-border pb-3.5">
              <div>
                <h2 className="text-base font-black text-brand-black flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Assign Working Shift
                </h2>
                <p className="text-xs text-brand-muted mt-0.5">
                  Update employee daily shift timing, grace window, and roster schedule.
                </p>
              </div>
              <button
                onClick={() => setQuickShiftModal(null)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <QuickShiftModal
              emp={quickShiftModal}
              shifts={lists.shifts || []}
              onClose={() => setQuickShiftModal(null)}
              onSuccess={(m) => {
                setQuickShiftModal(null);
                showNotification(m);
                load();
              }}
            />
          </div>
        </div>
      )}

      {/* Salary & CTC Setup Modal */}
      {salaryModalEmp && (
        <SalaryModal
          employee={salaryModalEmp}
          onClose={() => setSalaryModalEmp(null)}
          onSuccess={(m) => {
            setSalaryModalEmp(null);
            showNotification(m);
            load();
          }}
        />
      )}
    </div>
  );
}
