"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  ShieldCheck, 
  Building2, 
  ScanFace, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const schema = z.object({
  companyName: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email("Please enter a valid work email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsRegister(window.location.search.includes("register"));
    }
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      companyName: "",
      name: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setErrorMessage("");
    try {
      const endpoint = isRegister ? "/auth/register-company" : "/auth/login";
      const payload = isRegister 
        ? {
            companyName: data.companyName || "My Company",
            name: data.name || "Administrator",
            email: data.email,
            password: data.password,
          }
        : {
            email: data.email,
            password: data.password,
          };

      const tokens = await api<{ accessToken: string; refreshToken: string }>(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      sessionStorage.setItem("at", tokens.accessToken);
      sessionStorage.setItem("rt", tokens.refreshToken);

      const me = await api<{ isSuperAdmin: boolean; perms: string[]; tenantId: string | null }>(
        "/auth/me"
      );

      if (me.isSuperAdmin) {
        window.location.href = "/super-admin/dashboard";
      } else if (me.perms && me.perms.length > 0) {
        window.location.href = "/app/dashboard";
      } else {
        window.location.href = "/employee/attendance";
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication failed. Please check credentials.");
    }
  };

  const fillCredentials = (email: string, pass: string) => {
    setIsRegister(false);
    setValue("email", email);
    setValue("password", pass);
    setErrorMessage("");
  };

  return (
    <div className="flex min-h-screen bg-brand-bg">
      {/* Left Branding / Value Proposition Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-neutral-900 p-12 text-white border-r border-neutral-800">
        <div>
          <Link href="/" className="inline-block">
            <Logo h={46} />
          </Link>

          <div className="mt-16 max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-red/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-red">
              <Sparkles className="h-3.5 w-3.5" /> All-in-One Enterprise Platform
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl text-white">
              Smarter HRM, AI Biometrics & CRM For Modern Teams.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400">
              Transform attendance tracking, payroll compliance, shift rotations, and sales deal pipelines with one intuitive cloud workspace.
            </p>

            <div className="mt-8 space-y-4 text-sm text-neutral-300">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-neutral-800 p-2 text-brand-red">
                  <ScanFace className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Face Biometric Attendance</p>
                  <p className="text-xs text-neutral-400">3D anti-spoof liveness check directly in employee browsers.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-neutral-800 p-2 text-blue-400">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Workforce HRM & Automated Payroll</p>
                  <p className="text-xs text-neutral-400">Statutory PF/ESI/PT deductions, leave sync, and PDF payslips.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-neutral-800 p-2 text-orange-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">CRM Sales & Deal Stages</p>
                  <p className="text-xs text-neutral-400">Visual Kanban pipelines, customer records, and rep sales quotas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-6 text-xs text-neutral-500 flex items-center justify-between">
          <span>Protected with AES-256-GCM Encryption</span>
          <span>© {new Date().getFullYear()} HBS Workspace</span>
        </div>
      </div>

      {/* Right Login / Register Card */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo */}
          <div className="mb-6 flex justify-center lg:hidden">
            <Link href="/">
              <Logo h={44} />
            </Link>
          </div>

          <div className="rounded-2xl border border-brand-border bg-white p-7 shadow-xl sm:p-9">
            {/* Mode Switcher Tabs */}
            <div className="mb-6 flex rounded-xl bg-brand-bg p-1">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setErrorMessage(""); }}
                className={`w-1/2 rounded-lg py-2 text-xs font-bold transition ${
                  !isRegister
                    ? "bg-white text-brand-black shadow-sm"
                    : "text-brand-muted hover:text-brand-black"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setErrorMessage(""); }}
                className={`w-1/2 rounded-lg py-2 text-xs font-bold transition ${
                  isRegister
                    ? "bg-white text-brand-black shadow-sm"
                    : "text-brand-muted hover:text-brand-black"
                }`}
              >
                Register Company
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight text-brand-black">
                {isRegister ? "Create company account" : "Welcome back"}
              </h2>
              <p className="mt-1 text-xs text-brand-muted">
                {isRegister
                  ? "Start your 14-day full feature trial in 30 seconds."
                  : "Access your company workspace or administration portal."}
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              {isRegister && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted">
                      Company Name
                    </label>
                    <div className="relative mt-1">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-brand-muted" />
                      <input
                        type="text"
                        placeholder="e.g. Acme Technologies Pvt Ltd"
                        {...register("companyName")}
                        className="w-full rounded-xl border border-brand-border bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted">
                      Your Full Name
                    </label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-3 h-4 w-4 text-brand-muted" />
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        {...register("name")}
                        className="w-full rounded-xl border border-brand-border bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted">
                  Work Email Address
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-brand-muted" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    {...register("email")}
                    className="w-full rounded-xl border border-brand-border bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted">
                    Password
                  </label>
                  {!isRegister && (
                    <span className="text-[11px] text-brand-muted">
                      Min 8 characters
                    </span>
                  )}
                </div>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-brand-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                    className="w-full rounded-xl border border-brand-border bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-brand-muted hover:text-brand-black"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full py-3 text-sm shadow-md"
              >
                {isSubmitting ? (
                  "Authenticating..."
                ) : isRegister ? (
                  "Create Company & Launch Trial"
                ) : (
                  "Sign In to Workspace"
                )}
              </Button>
            </form>

            {/* Quick Demo & Test Accounts Section */}
            <div className="mt-8 border-t border-brand-border pt-6">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-black">
                <Sparkles className="h-3.5 w-3.5 text-brand-red" />
                <span>Demo & Testing Credentials</span>
              </div>
              <p className="mt-1 text-[11px] text-brand-muted">
                Click any profile below to instantly auto-fill credentials for testing:
              </p>

              <div className="mt-3 space-y-2">
                {/* Super Admin Preset */}
                <div 
                  onClick={() => fillCredentials("admin@hbsworkspace.com", "ChangeMe@123")}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-brand-border bg-neutral-50 p-2.5 text-left transition hover:border-brand-black hover:bg-neutral-100"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-brand-black">Super Admin</span>
                      <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-800">System Root</span>
                    </div>
                    <p className="truncate text-[11px] text-brand-muted">
                      admin@hbsworkspace.com · ChangeMe@123
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-black border border-brand-border shadow-xs group-hover:bg-brand-black group-hover:text-white"
                  >
                    Auto Fill
                  </button>
                </div>

                {/* Company Owner Preset */}
                <div 
                  onClick={() => fillCredentials("alice@apex.com", "Password@123")}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-brand-border bg-neutral-50 p-2.5 text-left transition hover:border-brand-black hover:bg-neutral-100"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-brand-black">Company Owner</span>
                      <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-800">HRM + CRM</span>
                    </div>
                    <p className="truncate text-[11px] text-brand-muted">
                      alice@apex.com · Password@123
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-black border border-brand-border shadow-xs group-hover:bg-brand-black group-hover:text-white"
                  >
                    Auto Fill
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-brand-muted">
              {isRegister ? (
                <span>
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(false); setErrorMessage(""); }}
                    className="font-bold text-brand-red hover:underline"
                  >
                    Sign In
                  </button>
                </span>
              ) : (
                <span>
                  Don't have a workspace?{" "}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(true); setErrorMessage(""); }}
                    className="font-bold text-brand-red hover:underline"
                  >
                    Start Free Trial
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
