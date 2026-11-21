"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Calculator,
  Check,
  Calendar,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  X,
  History,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Modal, inp } from "@/components/ui/modal";
import { api, inr } from "@/lib/api";

const F = ["basic", "hra", "da", "conveyance", "medical", "special", "tdsMonthly"] as const;

export function SalaryModal({
  employee,
  onClose,
  onSuccess,
}: {
  employee: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickCtc, setQuickCtc] = useState<string>("");

  const [f, setF] = useState<any>({
    effectiveFrom: new Date().toLocaleDateString("en-CA"),
    basic: "",
    hra: "",
    da: "",
    conveyance: "1600",
    medical: "1250",
    special: "",
    tdsMonthly: "",
    pfApplicable: true,
    esiApplicable: false,
    ptApplicable: false,
    overtimeEligible: false,
  });

  const empId = employee.id || employee.employeeId;

  // Load existing salary revision history
  const loadHistory = useCallback(async () => {
    if (!empId) return;
    try {
      const res: any = await api(`/payroll/structures?employeeId=${empId}`);
      if (Array.isArray(res) && res.length > 0) {
        setHistory(res);
        const latest = res[0];
        setF({
          effectiveFrom: new Date().toLocaleDateString("en-CA"),
          basic: String(latest.basic ?? ""),
          hra: String(latest.hra ?? ""),
          da: String(latest.da ?? ""),
          conveyance: String(latest.conveyance ?? "1600"),
          medical: String(latest.medical ?? "1250"),
          special: String(latest.special ?? ""),
          tdsMonthly: String(latest.tdsMonthly ?? ""),
          pfApplicable: latest.pfApplicable ?? true,
          esiApplicable: latest.esiApplicable ?? false,
          ptApplicable: latest.ptApplicable ?? false,
          overtimeEligible: latest.overtimeEligible ?? false,
        });
      }
    } catch {
      // ignore
    }
  }, [empId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 1-Click Auto CTC Calculator (Standard Indian Salary Breakup)
  const autoCalculateCtc = () => {
    const gross = Number(quickCtc);
    if (!gross || gross <= 0) return;

    // Basic = 50% of Monthly Gross
    const basic = Math.round(gross * 0.5);
    // HRA = 40% of Basic
    const hra = Math.round(basic * 0.4);
    // Conveyance = 1600
    const conv = 1600;
    // Medical = 1250
    const med = 1250;
    // Remainder to Special Allowance
    const remainder = Math.max(0, gross - (basic + hra + conv + med));

    setF((prev: any) => ({
      ...prev,
      basic: String(basic),
      hra: String(hra),
      da: "0",
      conveyance: String(conv),
      medical: String(med),
      special: String(remainder),
      esiApplicable: gross <= 21000, // ESI mandatory if gross <= 21k
      pfApplicable: true,
    }));
  };

  // Live total gross calculation
  const computedGross =
    Number(f.basic || 0) +
    Number(f.hra || 0) +
    Number(f.da || 0) +
    Number(f.conveyance || 0) +
    Number(f.medical || 0) +
    Number(f.special || 0);

  const computedAnnualCtc = computedGross * 12;

  // Submit salary revision
  const handleSave = async () => {
    if (!f.basic || Number(f.basic) <= 0) return;
    setLoading(true);

    try {
      const body: any = {
        employeeId: empId,
        effectiveFrom: f.effectiveFrom,
        pfApplicable: !!f.pfApplicable,
        esiApplicable: !!f.esiApplicable,
        ptApplicable: !!f.ptApplicable,
        overtimeEligible: !!f.overtimeEligible,
      };

      F.forEach((k) => {
        if (f[k] !== "") body[k] = Number(f[k]);
      });

      await api("/payroll/structures", {
        method: "POST",
        body: JSON.stringify(body),
      });

      onSuccess(`Salary structure for ${employee.fullName || "employee"} saved successfully (${inr(computedGross)}/mo)`);
      onClose();
    } catch (e: any) {
      alert(e.message || "Failed to save salary revision");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Salary & CTC Structure · ${employee.fullName}`}
      onClose={onClose}
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        {/* Employee Subheader */}
        <div className="flex items-center justify-between rounded-2xl bg-neutral-50 p-3 border border-brand-border text-xs">
          <div>
            <span className="font-bold text-brand-black">{employee.fullName}</span>
            <span className="font-mono text-neutral-500 ml-2">({employee.employeeCode})</span>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {employee.designation?.name || employee.designation || "Staff"} · {employee.department?.name || employee.department || "General"} · {employee.branch?.name || employee.branch || "All Branches"}
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1">
            Active Staff
          </span>
        </div>

        {/* 1-Click Auto CTC Calculator Box */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-black text-xs text-emerald-900">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>⚡ 1-Click CTC Auto-Calculator</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold">
              Standard Indian 50/40 Split
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                ₹
              </span>
              <input
                type="number"
                placeholder="Enter Target Monthly Gross (e.g. 50000)"
                value={quickCtc}
                onChange={(e) => setQuickCtc(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white py-1.5 pl-7 pr-3 text-xs font-bold text-brand-black outline-none focus:border-emerald-600"
              />
            </div>

            <Button
              variant="primary"
              className="text-xs shrink-0 bg-emerald-600 hover:bg-emerald-700"
              disabled={!quickCtc || Number(quickCtc) <= 0}
              onClick={autoCalculateCtc}
            >
              <Calculator className="h-3.5 w-3.5 mr-1" /> Auto-Split CTC
            </Button>
          </div>
        </div>

        {/* Component Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Effective From Date">
              <input
                type="date"
                className={inp}
                value={f.effectiveFrom}
                onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })}
              />
            </Field>

            <Field label="Basic Salary (₹ / month) *">
              <input
                type="number"
                className={`${inp} font-bold text-brand-black`}
                placeholder="e.g. 25000"
                value={f.basic}
                onChange={(e) => setF({ ...f, basic: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="HRA (House Rent) ₹">
              <input
                type="number"
                className={inp}
                placeholder="e.g. 10000"
                value={f.hra}
                onChange={(e) => setF({ ...f, hra: e.target.value })}
              />
            </Field>

            <Field label="Dearness (DA) ₹">
              <input
                type="number"
                className={inp}
                placeholder="e.g. 0"
                value={f.da}
                onChange={(e) => setF({ ...f, da: e.target.value })}
              />
            </Field>

            <Field label="Conveyance ₹">
              <input
                type="number"
                className={inp}
                placeholder="e.g. 1600"
                value={f.conveyance}
                onChange={(e) => setF({ ...f, conveyance: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Medical Allowance ₹">
              <input
                type="number"
                className={inp}
                placeholder="e.g. 1250"
                value={f.medical}
                onChange={(e) => setF({ ...f, medical: e.target.value })}
              />
            </Field>

            <Field label="Special Allowance ₹">
              <input
                type="number"
                className={inp}
                placeholder="Balance amount"
                value={f.special}
                onChange={(e) => setF({ ...f, special: e.target.value })}
              />
            </Field>

            <Field label="Monthly TDS (Tax) ₹">
              <input
                type="number"
                className={inp}
                placeholder="Manual TDS deduction"
                value={f.tdsMonthly}
                onChange={(e) => setF({ ...f, tdsMonthly: e.target.value })}
              />
            </Field>
          </div>

          {/* Statutory Compliance Checkboxes */}
          <div className="rounded-2xl border border-brand-border bg-neutral-50/70 p-3.5 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Statutory Compliances & Eligibility
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-neutral-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={f.pfApplicable}
                  onChange={(e) => setF({ ...f, pfApplicable: e.target.checked })}
                  className="rounded text-brand-black"
                />
                <span>Provident Fund (PF - 12%)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={f.esiApplicable}
                  onChange={(e) => setF({ ...f, esiApplicable: e.target.checked })}
                  className="rounded text-brand-black"
                />
                <span>ESI Applicable</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={f.ptApplicable}
                  onChange={(e) => setF({ ...f, ptApplicable: e.target.checked })}
                  className="rounded text-brand-black"
                />
                <span>Professional Tax (PT)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={f.overtimeEligible}
                  onChange={(e) => setF({ ...f, overtimeEligible: e.target.checked })}
                  className="rounded text-brand-black"
                />
                <span>Overtime Eligible</span>
              </label>
            </div>
          </div>

          {/* Live Calculated CTC Card */}
          <div className="rounded-2xl bg-neutral-900 text-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Total Monthly Gross Salary
              </span>
              <div className="text-2xl font-black text-emerald-400">
                {inr(computedGross)}
                <span className="text-xs text-neutral-400 font-medium ml-1">/ month</span>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-neutral-800 sm:pl-4">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Annual Cost to Company (CTC)
              </span>
              <div className="text-xl font-black text-white">
                {inr(computedAnnualCtc)}
                <span className="text-xs text-neutral-400 font-medium ml-1">/ year</span>
              </div>
            </div>
          </div>
        </div>

        {/* Previous Revision History */}
        {history.length > 0 && (
          <div className="pt-2 border-t border-brand-border space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
              <History className="h-3.5 w-3.5" />
              <span>Past Salary Revisions ({history.length})</span>
            </div>
            <div className="space-y-1.5">
              {history.map((h) => {
                const hGross =
                  Number(h.basic) +
                  Number(h.hra || 0) +
                  Number(h.da || 0) +
                  Number(h.conveyance || 0) +
                  Number(h.medical || 0) +
                  Number(h.special || 0);

                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600"
                  >
                    <span>
                      Effective: <b>{new Date(h.effectiveFrom).toLocaleDateString()}</b>
                    </span>
                    <span className="font-bold text-brand-black">Gross: {inr(hGross)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading || !f.basic || Number(f.basic) <= 0}
            className="font-bold"
          >
            {loading ? "Saving Revision..." : "Save Salary Revision"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
