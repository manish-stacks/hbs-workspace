"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ScanFace, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Building2, 
  Sparkles, 
  Smartphone, 
  Layers, 
  Briefcase, 
  Award, 
  FileText, 
  Headphones, 
  Zap,
  Check,
  X,
  Star,
  Hourglass,
  Cloud,
  ChevronRight,
  ChevronDown,
  Calculator,
  Laptop,
  CheckCircle,
  HelpCircle,
  Sliders,
  Play,
  RotateCcw,
  MapPin,
  FileSpreadsheet,
  Download,
  Activity,
  MessageCircle,
  Share2
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

// Brand Logo SVG Helpers (Faithful to Hover Business Services LLC screenshot)
function WordPressLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#21759B">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312L5.05 12.022l.006-.058c.45-.04 1.15-.098 1.15-.098.58-.035.64-.897.06-.897 0 0-.87.07-1.45.07-.46 0-1.42-.07-1.42-.07-.58 0-.52.862.06.897 0 0 .67.058 1.09.098L6.46 17.5 4.02 10.42c-.29-.84-.52-1.14-1.02-1.2-.5-.06-.5-.86.06-.86.75.06 1.74.06 2.38.06.7 0 1.63 0 2.38-.06.56 0 .56.8.06.86-.44.06-.72.33-.72.93 0 .47.23 1.16.47 1.8l2.09 6.09 1.4-4.66-.99-3.23c-.35-.93-.64-1.05-1.1-1.05-.53 0-.53-.8.06-.86.75.06 1.68.06 2.38.06.64 0 1.57 0 2.38-.06.59 0 .59.8.06.86-.47.06-.75.29-.75.87 0 .47.23 1.16.46 1.8l1.4 4.54 2.85-8.31c.23-.7.06-.99-.52-1.05-.59-.06-.53-.86.06-.86.64.06 1.63.06 2.33.06.41 0 1.28-.06 2.03-.06.59 0 .59.8.06.86-.47.06-.76.35-.99 1.05l-3.66 10.7c3.43-1.63 5.81-5.11 5.81-9.17 0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function LinkedInLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function GoogleDriveLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" fill="none">
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA" />
      <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44C.4 49.9 0 51.45 0 53h27.5L43.65 25z" fill="#00AC47" />
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15 7.9 13.65z" fill="#EA4335" />
      <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2L43.65 25z" fill="#00832D" />
      <path d="M59.8 53H87.3c0-1.55-.4-3.1-1.2-4.5L72.35 24.7c-.8-1.4-1.95-2.5-3.3-3.3L55.3 45.2 59.8 53z" fill="#2684FC" />
      <path d="M73.55 76.8H27.5L41.25 53h32.3c0 1.55-.4 3.1-1.2 4.5l-2.1 3.65-3.8 6.65c-.8 1.4-1.95 2.5-3.3 3.3l4.7 5.7z" fill="#FFBA00" />
    </svg>
  );
}

function NextJsLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 180 180" fill="none">
      <circle cx="90" cy="90" r="90" fill="#000000" />
      <path d="M149.508 157.438L69.1478 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.138 149.508 157.438Z" fill="#FFFFFF" />
      <path d="M115.886 54H128V126H115.886V54Z" fill="#FFFFFF" />
    </svg>
  );
}

function ShopifyLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#95BF47">
      <path d="M18.5 7.7c-.1-.3-.3-.4-.5-.4h-1.8c-.1-.7-.5-2.6-1.9-3.9-1.2-1.1-2.6-1.4-3.7-1.4-3.1 0-4.6 2.8-5 5.3H3.8c-.3 0-.5.2-.6.5L1 21.3c0 .3.1.6.4.7.1 0 .2 0 .3 0h17.6c.3 0 .5-.2.6-.5l2-13.8zm-7.9-3.7c.7 0 1.6.2 2.4 1 1 1 1.3 2.5 1.4 3h-6.8c.4-1.9 1.4-4 3-4zm-4.8 15.3l1.8-12.3h1.8c-.1.7-.1 1.4-.1 2 0 .5.4.9.9.9s.9-.4.9-.9c0-.6 0-1.3.1-2h4.8c.1.7.1 1.4.1 2 0 .5.4.9.9.9s.9-.4.9-.9c0-.6 0-1.3.1-2h1.8l1.8 12.3H5.8z" />
    </svg>
  );
}

function PinterestLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#BD081C">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.64 7.86 6.38 9.32-.09-.78-.17-1.98.04-2.83.18-.78 1.2-5.07 1.2-5.07s-.3-.62-.3-1.53c0-1.43.83-2.5 1.86-2.5.88 0 1.3.66 1.3 1.45 0 .88-.56 2.21-.85 3.43-.24 1.03.52 1.87 1.53 1.87 1.84 0 3.25-1.94 3.25-4.74 0-2.48-1.78-4.21-4.33-4.21-2.95 0-4.68 2.21-4.68 4.5 0 .89.34 1.84.77 2.36.08.1.1.19.07.3-.08.33-.26 1.05-.29 1.19-.05.2-.16.24-.37.15-1.38-.64-2.24-2.66-2.24-4.28 0-3.49 2.53-6.69 7.32-6.69 3.84 0 6.83 2.74 6.83 6.4 0 3.82-2.41 6.89-5.75 6.89-1.12 0-2.18-.58-2.54-1.27l-.69 2.63c-.25.96-.92 2.16-1.37 2.89A9.99 9.99 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
    </svg>
  );
}

function WhatsAppLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#FFFFFF">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24M8.53 7.33c-.16 0-.35.06-.53.27-.18.2-.7.69-.7 1.68s.72 1.95.82 2.08c.1.14 1.38 2.11 3.35 2.96.47.2.83.33 1.12.42.47.15.9.13 1.24.08.38-.06 1.17-.48 1.33-.94.16-.47.16-.86.12-.94-.05-.09-.18-.14-.38-.24s-1.17-.58-1.35-.64c-.18-.07-.31-.1-.44.1-.14.2-.53.64-.65.78-.12.13-.23.15-.43.05-.2-.1-.85-.31-1.62-1-.6-.53-1-1.19-1.12-1.39-.12-.2-.01-.31.09-.41.09-.09.2-.23.3-.35.1-.11.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.44-1.06-.6-1.45-.16-.39-.33-.33-.45-.34h-.39z" />
    </svg>
  );
}

function RobotBotLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#FFFFFF">
      <path d="M12 2a1 1 0 0 1 1 1v1.07A8.001 8.001 0 0 1 20 12v3a4 4 0 0 1-4 4h-1v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1H8a4 4 0 0 1-4-4v-3a8.001 8.001 0 0 1 7-7.93V3a1 1 0 0 1 1-1zm-4 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </svg>
  );
}

// Testimonials data (Faithful to Screenshots Images 2 & 3: "Owners who stopped dreading salary day")
const reviewsRow1 = [
  {
    stars: 5,
    quote: "I am using PagarBook since 15 months! It has helped me in managing my 150 staff across 5 branches. Automatic attendance and online payments are very useful features for me",
    initials: "VK",
    avatarBg: "bg-blue-600",
    name: "Vijay Kumar",
    company: "Owner, Sai Ganesha Medicals",
    tag: "Attendance + Payments",
    tagColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    stars: 5,
    quote: "I am really happy to use PagarBook, it has really helped me to manage my staff. They maintain a good customer relationship, would insist others to use the product and see how good they are with their work",
    initials: "AG",
    avatarBg: "bg-teal-600",
    name: "Aditya Goradia",
    company: "Owner, Garodia Lifestyle & Garodia Fashion",
    tag: "Staff management",
    tagColor: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    stars: 5,
    quote: "PagarBook has complete staff digitization of calculation and saved a lot of operational time every month. Overtime and rotational shifts are completely handled without headaches.",
    initials: "SS",
    avatarBg: "bg-purple-600",
    name: "Smit Patel",
    company: "Director, Patel Logistics Group",
    tag: "Attendance + Payroll",
    tagColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    stars: 5,
    quote: "Managing 12 retail branches across Delhi-NCR was chaotic. With HBS branch-scoped roles, store managers handle daily shifts while I review consolidated PF/ESI reports in one click.",
    initials: "PH",
    avatarBg: "bg-emerald-600",
    name: "Pooja Hegde",
    company: "HR Head, Zenith Retail Chain",
    tag: "Multi-Branch",
    tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

const reviewsRow2 = [
  {
    stars: 5,
    quote: "I can see which shops they visited. Fake visits stopped. Having leads, deals, and staff attendance in one place allowed our sales revenue to grow 3x in 6 months.",
    initials: "RK",
    avatarBg: "bg-amber-600",
    name: "Rajesh Khanna",
    company: "Managing Director, Khanna Auto Corp",
    tag: "CRM + Geofence",
    tagColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    stars: 5,
    quote: "26 workers, two units in Hyderabad. Proxy punches were costing us ₹40,000 every single month. In-browser face liveness detection eliminated buddy punching completely without buying expensive machines.",
    initials: "MS",
    avatarBg: "bg-rose-600",
    name: "Meera Singhania",
    company: "Operations Head, Singhania Textiles",
    tag: "Biometric AI",
    tagColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    stars: 5,
    quote: "Colleague shift swap feature saved our hospital team so many emergency headaches. When someone needs leave, their colleague accepts and supervisor approves in one tap. Top tier enterprise software.",
    initials: "RN",
    avatarBg: "bg-indigo-600",
    name: "Dr. Rakesh Nair",
    company: "Chief Administrator, CarePoint Clinics",
    tag: "Shift Swaps & Rotations",
    tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    stars: 5,
    quote: "The night shift safe work date attribution is genius. Punching in at 9:30 PM and punching out at 6:00 AM next day no longer creates duplicate records or missed overtime calculations.",
    initials: "RS",
    avatarBg: "bg-cyan-600",
    name: "Rohan Sharma",
    company: "Operations VP, Apex Precision Engineering",
    tag: "Safe Shift Date",
    tagColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
];

export default function Home() {
  const [yearly, setYearly] = useState(false);
  const [activeTab, setActiveTab] = useState<"FACE" | "SHIFTS" | "PAYROLL" | "CRM" | "BRANCHES">("FACE");
  
  // Interactive Punch Simulator State for Device Mockup
  const [punchSimulating, setPunchSimulating] = useState(false);
  const [punchStep, setPunchStep] = useState<number>(3); // 0: detecting, 1: liveness, 2: geofence, 3: verified
  const [simStaffName, setSimStaffName] = useState("Vikram Malhotra");
  const [simShift, setSimShift] = useState("Morning General (9:00 AM - 6:00 PM)");

  // Interactive ROI Calculator State
  const [empSlider, setEmpSlider] = useState<number>(75);
  const [branchSlider, setBranchSlider] = useState<number>(4);

  // Instant Demo input state
  const [demoContact, setDemoContact] = useState("");
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // Industry Solution Tab State
  const [activeIndustry, setActiveIndustry] = useState<"MANUFACTURING" | "RETAIL" | "HEALTHCARE" | "AGENCIES">("MANUFACTURING");

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Dynamic calculations for ROI
  const hoursSaved = Math.round(empSlider * 0.5 + branchSlider * 6.5);
  const proxyMoneySaved = Math.round(empSlider * 520 + branchSlider * 3800);
  const hardwareSavings = branchSlider * 18500;

  // Run simulated punch sequence
  const triggerPunchSimulation = () => {
    setPunchSimulating(true);
    setPunchStep(0);
    setTimeout(() => {
      setPunchStep(1); // Liveness blink
      setTimeout(() => {
        setPunchStep(2); // GPS Geofence
        setTimeout(() => {
          setPunchStep(3); // Verified
          setPunchSimulating(false);
        }, 800);
      }, 900);
    }, 700);
  };

  const faqs = [
    {
      q: "Do we need to buy fingerprint machines or biometric hardware?",
      a: "No! HBS Workspace runs 100% in-browser on any smartphone, tablet, or laptop camera. Our AI face engine detects 68 biometric landmark points and runs randomized 3D liveness challenges (blink or head turn) to prevent photo or video spoofing without requiring expensive biometric hardware.",
    },
    {
      q: "How does night shift attendance work across midnight?",
      a: "Our shift engine features intelligent Safe Work Date Attribution. If an employee punches in at 8:00 PM and punches out at 4:30 AM the next calendar day, both punches are automatically tied to the original work date, calculating total hours, late arrivals, and overtime seamlessly.",
    },
    {
      q: "Can branch managers only see their own branch staff?",
      a: "Yes. Our multi-tenancy architecture provides strict branch and department scoping. Branch Managers only see staff, shifts, and attendance logs for their designated locations, while Company Owners and HR Managers maintain full cross-branch visibility.",
    },
    {
      q: "Is Indian statutory compliance (PF, ESI, PT, LWF) supported?",
      a: "Absolutely. HBS Workspace calculates Employees' Provident Fund (PF at 12%), Employee State Insurance (ESI at 0.75%), Professional Tax (PT slab rates), and Overtime using integer-paise math. You can generate single or bulk PDF payslips and bank transfer CSV files in one click.",
    },
    {
      q: "Is employee biometric data safe and legally compliant?",
      a: "Yes. Raw face photographs are never stored on our servers. Biometric descriptors are converted into 128-dimensional mathematical vector arrays and encrypted at rest using AES-256-GCM encryption with employee consent logging for full DPDP Act compliance.",
    },
    {
      q: "Can we migrate data from our existing biometric machines or Excel?",
      a: "Yes. We offer 1-click bulk CSV imports for employees, departments, historical attendance, and past salary structures so you can transition your entire workforce in under 15 minutes.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-brand-text font-sans antialiased selection:bg-brand-red selection:text-white">
      {/* Top Banner Notice */}
      <div className="bg-brand-black px-4 py-2.5 text-center text-xs font-medium text-white flex items-center justify-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-red px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
          <Sparkles className="h-3 w-3" /> Enterprise 2.0
        </span>
        <span>Unified Multi-Branch HRM, Shift Rostering, AI Face Biometrics & Sales CRM.</span>
        <Link href="/login" className="font-bold text-brand-red hover:underline flex items-center gap-1">
          Explore Live Demo Accounts <ArrowRight className="h-3 w-3 inline" />
        </Link>
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-brand-border bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-3">
            <Logo h={42} />
          </Link>

          <nav className="hidden items-center gap-7 text-xs font-bold uppercase tracking-wider text-neutral-600 lg:flex">
            <a href="#biometrics" className="transition hover:text-brand-red">Face AI</a>
            <a href="#interactive-tour" className="transition hover:text-brand-red">Workflows</a>
            <a href="#industries" className="transition hover:text-brand-red">Industries</a>
            <a href="#calculator" className="transition hover:text-brand-red">ROI Calculator</a>
            <a href="#testimonials" className="transition hover:text-brand-red">Client Stories</a>
            <a href="#pricing" className="transition hover:text-brand-red">Pricing</a>
            <a href="#faq" className="transition hover:text-brand-red">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" className="hidden sm:inline-flex rounded-full px-5 text-xs font-bold border-neutral-300 hover:border-brand-black">
                Sign In
              </Button>
            </Link>
            <Link href="/login?register=1">
              <Button variant="primary" className="rounded-full px-6 text-xs font-bold shadow-md shadow-red-500/20">
                Start 14-Day Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section (Faithful to Hover Business Services LLC + PagarBook ID Screenshots) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-neutral-50/80 via-white to-neutral-50/60 pt-16 pb-24 lg:pt-24 lg:pb-32 bg-blueprint-grid">
        {/* Soft radial glow overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.98)_100%)] pointer-events-none" />

        {/* Floating Tech Brand Badges (Left side - faithful to Image 1 Hover Business Services LLC) */}
        <div className="hidden xl:flex absolute left-10 2xl:left-16 top-32 flex-col gap-12 pointer-events-none z-10 animate-float">
          {/* WordPress */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200/90 bg-white shadow-xl backdrop-blur-md transition hover:scale-110 pointer-events-auto cursor-pointer">
            <WordPressLogo className="h-7 w-7" />
          </div>

          {/* LinkedIn */}
          <div className="ml-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200/90 bg-white shadow-xl backdrop-blur-md transition hover:scale-110 pointer-events-auto cursor-pointer">
            <LinkedInLogo className="h-7 w-7" />
          </div>

          {/* Google Drive */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200/90 bg-white shadow-xl backdrop-blur-md transition hover:scale-110 pointer-events-auto cursor-pointer">
            <GoogleDriveLogo className="h-7 w-7" />
          </div>
        </div>

        {/* Floating Tech Brand Badges (Right side - faithful to Image 1 Hover Business Services LLC) */}
        <div className="hidden xl:flex absolute right-10 2xl:right-16 top-32 flex-col gap-12 pointer-events-none z-10 animate-float-reverse">
          {/* Next.js */}
          <div className="ml-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200/90 bg-white shadow-xl backdrop-blur-md transition hover:scale-110 pointer-events-auto cursor-pointer">
            <NextJsLogo className="h-7 w-7" />
          </div>

          {/* Shopify */}
          <div className="mr-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200/90 bg-white shadow-xl backdrop-blur-md transition hover:scale-110 pointer-events-auto cursor-pointer">
            <ShopifyLogo className="h-7 w-7" />
          </div>

          {/* Pinterest */}
          <div className="ml-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200/90 bg-white shadow-xl backdrop-blur-md transition hover:scale-110 pointer-events-auto cursor-pointer">
            <PinterestLogo className="h-7 w-7" />
          </div>
        </div>

        {/* Hero Headline & Value Proposition (Faithful to Screenshot Image 1) */}
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          {/* Rating Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-1.5 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-brand-red animate-ping" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-700">
              • ★ RATED 4.9/5 ACROSS 2,500+ CLIENTS • AI-POWERED GROWTH AGENCY & WORKSPACE
            </span>
          </div>

          {/* Main Headline (Faithful typography and layout of Image 1) */}
          <h1 className="mt-8 text-4xl font-black tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl lg:leading-[1.1]">
            We Engineer Digital{" "}
            <span className="text-[#F21B2B] inline-block font-black drop-shadow-xs">
              Growth Engines
            </span>{" "}
            That Multiply Output & Revenue
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-base text-neutral-600 sm:text-lg leading-relaxed font-normal">
            Combining proprietary AI face biometric intelligence with 80+ in-house engineers, multi-branch shift rosters, automated PF/ESI payroll, and high-velocity CRM pipelines to build search dominance, custom Next.js platforms, and high-ROAS workforce operations.
          </p>

          {/* Quick CTA Actions (Matching Buttons from Image 1) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login?register=1">
              <Button variant="primary" className="h-12 rounded-full px-8 text-xs font-black shadow-xl shadow-red-500/25 flex items-center gap-2 hover:scale-105 transition">
                <Sparkles className="h-4 w-4" /> Get Free AI Growth Audit
              </Button>
            </Link>
            <a href="#interactive-tour">
              <Button variant="outline" className="h-12 rounded-full px-7 text-xs font-bold border-neutral-300 text-neutral-800 hover:border-black hover:bg-neutral-50 transition">
                Explore All 80+ Services &rarr;
              </Button>
            </a>
          </div>

          {/* Trust Highlights Bar (Faithful to bottom of Screenshot Image 1) */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-bold text-neutral-700">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> 100% In-House Engineers & Marketers
            </span>
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-red" /> ₹50Cr+ Client Revenue Unlocked
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" /> Offices in Delhi & Auckland
            </span>
          </div>
        </div>

        {/* Interactive Biometric Device Showcase Section (Faithful to PagarBook ID Screenshot Image 4) */}
        <div id="biometrics" className="relative mx-auto mt-20 max-w-6xl px-4 sm:px-6">
          {/* Instant Demo Input Form Bar (Matching Image 4 Top) */}
          <div className="mx-auto max-w-md text-center">
            {!demoSubmitted ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (demoContact.trim()) {
                    setDemoSubmitted(true);
                  }
                }}
                className="flex items-center rounded-full border border-neutral-300 bg-white p-1.5 shadow-lg shadow-neutral-200/60"
              >
                <div className="flex-1 px-4 text-left">
                  <input
                    type="text"
                    required
                    placeholder="Mobile number"
                    value={demoContact}
                    onChange={(e) => setDemoContact(e.target.value)}
                    className="w-full text-xs font-medium text-brand-black placeholder-neutral-400 focus:outline-none bg-transparent"
                  />
                </div>
                <button 
                  type="submit"
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-bold text-white shadow-md transition"
                >
                  Get a demo
                </button>
              </form>
            ) : (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-emerald-800 text-xs font-bold flex items-center justify-between">
                <span>Demo invite dispatched! Redirecting to live workspace...</span>
                <Link href="/login" className="underline text-emerald-950 font-black">
                  Sign In Now &rarr;
                </Link>
              </div>
            )}
            <p className="mt-2.5 text-[11px] text-neutral-400 font-medium">
              Free to start. No card, no contract.
            </p>
          </div>

          {/* Device Showcase with 8 Connected Feature Callout Cards */}
          <div className="relative mt-14 grid items-center gap-6 lg:grid-cols-12">
            {/* Left Connected Callout Cards (4 cards) */}
            <div className="space-y-5 lg:col-span-3">
              {/* 1. Attendance marked */}
              <div className="relative rounded-2xl border border-brand-border bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">Attendance marked</h4>
                    <p className="text-[11px] text-brand-muted">face matched at the gate</p>
                  </div>
                </div>
              </div>

              {/* 2. Late entry detected */}
              <div className="relative rounded-2xl border border-brand-border bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">Late entry detected</h4>
                    <p className="text-[11px] text-brand-muted">12 minutes, fine applied</p>
                  </div>
                </div>
              </div>

              {/* 3. Overtime calculated */}
              <div className="relative rounded-2xl border border-brand-border bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600 shrink-0">
                    <Hourglass className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">Overtime calculated</h4>
                    <p className="text-[11px] text-brand-muted">2h 15m at 1.5x</p>
                  </div>
                </div>
              </div>

              {/* 4. Works offline */}
              <div className="relative rounded-2xl border border-brand-border bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">Works offline</h4>
                    <p className="text-[11px] text-brand-muted">synced when you are back online</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Device Mockup with Video & Interactive Punch Simulator + Connecting Dashed Lines */}
            <div className="lg:col-span-6 relative flex flex-col items-center">
              {/* SVG Connecting Dashed Lines (Visible on desktop lg screens - Faithful to Image 4) */}
              <svg
                className="absolute inset-0 h-full w-full pointer-events-none hidden lg:block overflow-visible"
                viewBox="0 0 540 520"
                preserveAspectRatio="none"
              >
                {/* Left 4 Connecting Dashed Lines with anchor dots */}
                <path d="M -20 50 C 70 50, 80 120, 120 140" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 5" />
                <circle cx="120" cy="140" r="3" fill="#94A3B8" />

                <path d="M -20 150 C 70 150, 80 180, 120 200" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 5" />
                <circle cx="120" cy="200" r="3" fill="#94A3B8" />

                <path d="M -20 260 C 70 260, 80 270, 120 280" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 5" />
                <circle cx="120" cy="280" r="3" fill="#94A3B8" />

                <path d="M -20 370 C 70 370, 80 340, 120 330" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 5" />
                <circle cx="120" cy="330" r="3" fill="#94A3B8" />

                {/* Right 4 Connecting Dashed Lines with anchor dots */}
                <path d="M 560 50 C 470 50, 460 120, 420 140" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 5" />
                <circle cx="420" cy="140" r="3" fill="#94A3B8" />

                <path d="M 560 150 C 470 150, 460 180, 420 200" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 5" />
                <circle cx="420" cy="200" r="3" fill="#94A3B8" />

                <path d="M 560 260 C 470 260, 460 270, 420 280" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 5" />
                <circle cx="420" cy="280" r="3" fill="#94A3B8" />

                <path d="M 560 370 C 470 370, 460 340, 420 330" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 5" />
                <circle cx="420" cy="330" r="3" fill="#94A3B8" />
              </svg>

              {/* Realistic Terminal Device */}
              <div className="relative z-10 w-full max-w-[310px] rounded-[44px] border-[10px] border-neutral-900 bg-black p-3.5 shadow-2xl ring-1 ring-neutral-800">
                {/* Device Top Speaker & Camera Notch */}
                <div className="mx-auto mb-3 h-4 w-24 rounded-full bg-neutral-900 flex items-center justify-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-neutral-700" />
                  <span className="h-1.5 w-6 rounded-full bg-neutral-800" />
                </div>

                {/* Screen Display Container */}
                <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[28px] bg-black">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    src="/face-scanner-hero.webm"
                    className="h-full w-full object-cover"
                  />

                  {/* Real-time laser scanning reticle overlay */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34D399] animate-bounce pointer-events-none" />

                  {/* On-screen biometric HUD overlay */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 bg-gradient-to-t from-black/85 via-transparent to-black/40">
                    <div className="flex items-center justify-between text-[10px] text-white/90">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        HBS Terminal #1
                      </span>
                      <span className="rounded bg-black/70 px-2 py-0.5 font-mono text-[9px] text-emerald-400 border border-emerald-500/30">
                        {punchStep === 0 && "SEARCHING FACE..."}
                        {punchStep === 1 && "LIVENESS CHALLENGE: BLINK"}
                        {punchStep === 2 && "VERIFYING GPS GEOFENCE"}
                        {punchStep === 3 && "MATCH: 99.8% (PASS)"}
                      </span>
                    </div>

                    <div className="rounded-2xl bg-black/80 p-3 text-center backdrop-blur-md border border-white/10 shadow-lg">
                      <p className="text-xs font-black text-white">{simStaffName}</p>
                      <p className="text-[10px] text-emerald-400 font-semibold">{simShift}</p>
                      <div className="mt-1 flex items-center justify-center gap-2 text-[9px] text-neutral-400 font-mono">
                        <span>PUNCH: 09:02 AM</span>
                        <span>•</span>
                        <span className="text-emerald-300">ON-TIME</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Device Bezel Label (Faithful to Image 4) */}
                <div className="mt-3 text-center">
                  <p className="font-black text-xs uppercase tracking-widest text-neutral-300">
                    PagarBook ID
                  </p>
                </div>
              </div>

              {/* Bottom Rule Pill Badge (Faithful to Image 4) */}
              <div className="relative z-10 mt-5 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={triggerPunchSimulation}
                  disabled={punchSimulating}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 hover:bg-black px-6 py-2.5 text-xs font-bold text-white shadow-xl transition border border-neutral-700 hover:scale-105 active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5 text-brand-red animate-spin" />
                  <span>{punchSimulating ? "Verifying Face AI..." : "✦ 12 more rules ran on that one punch"}</span>
                </button>
              </div>
            </div>

            {/* Right Connected Callout Cards (4 cards) */}
            <div className="space-y-5 lg:col-span-3">
              {/* 1. Shift matched */}
              <div className="relative rounded-2xl border border-brand-border bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">Shift matched</h4>
                    <p className="text-[11px] text-brand-muted">9 to 6, and the roster knows</p>
                  </div>
                </div>
              </div>

              {/* 2. Payslip generated */}
              <div className="relative rounded-2xl border border-brand-border bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">Payslip generated</h4>
                    <p className="text-[11px] text-brand-muted">salaries processed in one click</p>
                  </div>
                </div>
              </div>

              {/* 3. PF, ESI, PT and LWF */}
              <div className="relative rounded-2xl border border-brand-border bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">PF, ESI, PT and LWF</h4>
                    <p className="text-[11px] text-brand-muted">stay 100% compliant</p>
                  </div>
                </div>
              </div>

              {/* 4. Staff app notified */}
              <div className="relative rounded-2xl border border-brand-border bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600 shrink-0">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-black">Staff app notified</h4>
                    <p className="text-[11px] text-brand-muted">in the language he reads</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Enterprise Metrics Marquee Banner */}
      <section className="border-y border-brand-border bg-neutral-900 py-10 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 text-center">
            <div>
              <p className="text-3xl font-black text-brand-red lg:text-4xl">2,500+</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Companies Powered</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white lg:text-4xl">150,000+</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Daily Face Punches</p>
            </div>
            <div>
              <p className="text-3xl font-black text-emerald-400 lg:text-4xl">₹50Cr+</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Monthly Payroll Settled</p>
            </div>
            <div>
              <p className="text-3xl font-black text-blue-400 lg:text-4xl">99.98%</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">System SLA Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Tabbed Product Tour Section */}
      <section id="interactive-tour" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-red">
              Live Product Experience
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
              Engineered For Every Step of Enterprise Workforce & Sales
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-brand-muted">
              Select a core workflow below to see how HBS Workspace automates complex business routines without friction.
            </p>

            {/* Workflow Tabs */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {[
                { id: "FACE", label: "Face Biometrics", icon: ScanFace },
                { id: "SHIFTS", label: "Multi-Shift Rostering", icon: Clock },
                { id: "PAYROLL", label: "1-Click Payroll & PF/ESI", icon: DollarSign },
                { id: "CRM", label: "Sales CRM Pipeline", icon: TrendingUp },
                { id: "BRANCHES", label: "Multi-Branch Geofencing", icon: Building2 },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition shadow-xs ${
                      active
                        ? "bg-brand-black text-white shadow-md scale-105"
                        : "border border-brand-border bg-white text-brand-muted hover:border-brand-black hover:text-brand-black"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-brand-red" : ""}`} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Screen Display Box */}
          <div className="mt-12 rounded-3xl border border-brand-border bg-neutral-900 p-8 text-white shadow-2xl">
            {activeTab === "FACE" && (
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-brand-red uppercase">
                    3D Anti-Spoof Liveness AI
                  </span>
                  <h3 className="mt-4 text-2xl font-black text-white sm:text-3xl">
                    Millisecond Face Matching With Zero Hardware Cost
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                    Staff simply look into any web camera or phone. The system generates a single-use random liveness challenge (such as a blink or head turn) that eliminates photo spoofing, masks, and video playback attacks.
                  </p>
                  <div className="mt-6 space-y-2.5 text-xs text-neutral-300">
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> 128D mathematical Euclidean vector descriptor</p>
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> AES-256-GCM encrypted storage at rest (DPDP Act compliant)</p>
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Geofence GPS boundary checks within designated branch perimeter</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3 text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-400" /> AI Face Verification Log
                    </span>
                    <span className="text-emerald-400 font-mono">Status: PASS (0.24 distance)</span>
                  </div>
                  <div className="mt-4 space-y-3 font-mono text-[11px] text-neutral-400">
                    <div className="flex justify-between bg-neutral-900 p-2.5 rounded-lg">
                      <span>Liveness Challenge:</span>
                      <span className="text-emerald-300 font-bold">BLINK (Verified in 180ms)</span>
                    </div>
                    <div className="flex justify-between bg-neutral-900 p-2.5 rounded-lg">
                      <span>Branch Geofence:</span>
                      <span className="text-white">Delhi HQ (38m away • Inside Geofence)</span>
                    </div>
                    <div className="flex justify-between bg-neutral-900 p-2.5 rounded-lg">
                      <span>Shift Assigned:</span>
                      <span className="text-white">Morning General (09:00 - 18:00)</span>
                    </div>
                    <div className="flex justify-between bg-neutral-900 p-2.5 rounded-lg">
                      <span>Biometric Key Hash:</span>
                      <span className="text-neutral-500 font-mono text-[10px]">aes-gcm:9f8a2...3b1d</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "SHIFTS" && (
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-400 uppercase">
                    Rotational & Night Shifts
                  </span>
                  <h3 className="mt-4 text-2xl font-black text-white sm:text-3xl">
                    Night-Shift Safe Work Date & Colleague Swaps
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                    Never worry about punches that cross midnight. Our roster engine automatically assigns late-night hours to the correct shift date and allows colleagues to initiate shift swaps with single-tap manager approval.
                  </p>
                  <div className="mt-6 space-y-2.5 text-xs text-neutral-300">
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> General, Morning, Evening, Night & Split shifts</p>
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Colleague shift swap approval workflow</p>
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Branch & department specific holiday schedules</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3 text-xs">
                    <span className="font-bold text-white">Roster Calendar Matrix</span>
                    <span className="text-blue-400 font-bold">3 Active Shifts</span>
                  </div>
                  <div className="rounded-xl bg-neutral-900 p-3 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">Morning Shift (9:00 AM - 6:00 PM)</p>
                      <p className="text-[11px] text-neutral-400">84 Staff Checked-in</p>
                    </div>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-bold">ACTIVE</span>
                  </div>
                  <div className="rounded-xl bg-neutral-900 p-3 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">Night Shift (8:00 PM - 5:00 AM)</p>
                      <p className="text-[11px] text-neutral-400">32 Staff Assigned • Cross-Midnight Safe</p>
                    </div>
                    <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 font-bold">ROSTERED</span>
                  </div>
                  <div className="rounded-xl bg-neutral-900/60 p-3 text-xs flex justify-between items-center border border-purple-500/30">
                    <div>
                      <p className="font-bold text-purple-300">Shift Swap Request: Priya &rarr; Rahul</p>
                      <p className="text-[11px] text-neutral-400">Swap Date: Tomorrow Evening Shift</p>
                    </div>
                    <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400 font-bold">PENDING APPROVAL</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "PAYROLL" && (
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 uppercase">
                    Compliant Statutory Math
                  </span>
                  <h3 className="mt-4 text-2xl font-black text-white sm:text-3xl">
                    One-Click PF, ESI, PT & Bulk PDF Payslips
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                    Attendance, leaves, and LWP automatically sync into the payroll engine. Run draft calculations, review adjustments, approve, lock, and export bank transfer CSVs in minutes.
                  </p>
                  <div className="mt-6 space-y-2.5 text-xs text-neutral-300">
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Integer-paise precision (Zero rounding discrepancies)</p>
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Automated PF (12%), ESI (0.75%), PT slab calculations</p>
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Single & bulk branded PDF payslip downloads</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3 text-xs">
                    <span className="font-bold text-white">Salary Register Summary</span>
                    <span className="text-emerald-400 font-bold">November 2026 Run</span>
                  </div>
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-neutral-900">
                      <span className="text-neutral-400">Gross Salaries (120 Staff):</span>
                      <span className="font-bold text-white">₹38,40,000</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-900">
                      <span className="text-neutral-400">Statutory PF Deductions (12%):</span>
                      <span className="font-bold text-amber-400">-₹4,60,800</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-900">
                      <span className="text-neutral-400">ESI & PT Deductions:</span>
                      <span className="font-bold text-amber-400">-₹1,15,200</span>
                    </div>
                    <div className="flex justify-between py-1 text-emerald-400 font-bold text-sm">
                      <span>Net Bank Transfer Payout:</span>
                      <span>₹32,64,000</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 rounded-lg bg-neutral-800 py-2 text-[11px] font-bold text-neutral-300 hover:bg-neutral-700 flex items-center justify-center gap-1.5">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Bank CSV Export
                    </button>
                    <button className="flex-1 rounded-lg bg-neutral-800 py-2 text-[11px] font-bold text-neutral-300 hover:bg-neutral-700 flex items-center justify-center gap-1.5">
                      <Download className="h-3.5 w-3.5 text-blue-400" /> Bulk PDF Payslips
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "CRM" && (
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-400 uppercase">
                    Integrated Revenue Engine
                  </span>
                  <h3 className="mt-4 text-2xl font-black text-white sm:text-3xl">
                    Close High-Value Deals In The Same Platform
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                    Why pay separately for Salesforce or HubSpot? Your sales executives can manage leads, drag-and-drop deals across pipeline stages, and log customer activities directly alongside workforce records.
                  </p>
                  <div className="mt-6 space-y-2.5 text-xs text-neutral-300">
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Multi-stage visual Kanban pipeline</p>
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Sales representative quotas & realization</p>
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> 1-Click lead to customer & deal conversion</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3 text-xs">
                    <span className="font-bold text-white">Pipeline Stages</span>
                    <span className="text-orange-400 font-bold">₹18.4L Closed Won</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="rounded-lg bg-neutral-900 p-2.5 flex justify-between">
                      <span className="font-semibold text-white">New Leads (18 Deals)</span>
                      <span className="text-neutral-400">₹6,20,000</span>
                    </div>
                    <div className="rounded-lg bg-neutral-900 p-2.5 flex justify-between">
                      <span className="font-semibold text-white">Proposal Sent (6 Deals)</span>
                      <span className="text-neutral-400">₹9,80,000</span>
                    </div>
                    <div className="rounded-lg bg-emerald-950/60 border border-emerald-800/40 p-2.5 flex justify-between text-emerald-300 font-bold">
                      <span>Closed & Won This Month</span>
                      <span>₹18,40,000</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "BRANCHES" && (
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-400 uppercase">
                    Cross-Location Governance
                  </span>
                  <h3 className="mt-4 text-2xl font-black text-white sm:text-3xl">
                    Strict Branch Scoping With Owner Oversight
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                    Each branch manager only accesses employees and shifts in their physical location. Company owners see real-time bird-eye metrics across all locations in a single dashboard.
                  </p>
                  <div className="mt-6 space-y-2.5 text-xs text-neutral-300">
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Dedicated GPS geofencing radius (e.g. 150m)</p>
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Branch-specific shift rosters & holiday calendars</p>
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Multi-branch consolidated payroll or branch-wise payout</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3 text-xs">
                    <span className="font-bold text-white">Active Branch Locations</span>
                    <span className="text-purple-400 font-bold">3 Locations Online</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="rounded-xl bg-neutral-900 p-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-red-500" /> Delhi HQ (Connaught Place)</p>
                        <p className="text-[11px] text-neutral-400">82 Staff • 150m Geofence Active</p>
                      </div>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-bold">SYNCED</span>
                    </div>
                    <div className="rounded-xl bg-neutral-900 p-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-blue-500" /> Mumbai Branch (BKC)</p>
                        <p className="text-[11px] text-neutral-400">45 Staff • 200m Geofence Active</p>
                      </div>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-bold">SYNCED</span>
                    </div>
                    <div className="rounded-xl bg-neutral-900 p-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-emerald-500" /> Bengaluru Hub (Whitefield)</p>
                        <p className="text-[11px] text-neutral-400">60 Staff • 150m Geofence Active</p>
                      </div>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-bold">SYNCED</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Industry Solutions Matrix ("Built For Every Sector") */}
      <section id="industries" className="py-24 bg-neutral-50 border-t border-brand-border">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-red">
              Tailored Architecture
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
              Engineered For High-Output Indian Industries
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-brand-muted">
              Whether you operate factories, retail showrooms, hospitals, or fast-growing digital agencies, HBS Workspace adapts to your operational requirements.
            </p>

            {/* Industry Tabs */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {[
                { id: "MANUFACTURING", label: "Factories & Manufacturing" },
                { id: "RETAIL", label: "Retail & Multi-Store Outlets" },
                { id: "HEALTHCARE", label: "Healthcare & Hospitals" },
                { id: "AGENCIES", label: "Tech, Agencies & Consultancies" },
              ].map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => setActiveIndustry(ind.id as any)}
                  className={`rounded-full px-5 py-2 text-xs font-bold transition ${
                    activeIndustry === ind.id
                      ? "bg-brand-red text-white shadow-md"
                      : "bg-white text-neutral-600 border border-neutral-300 hover:text-brand-black"
                  }`}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
            {activeIndustry === "MANUFACTURING" && (
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-brand-red uppercase">Challenge: Shift Fatigue & Overtime</span>
                  <h4 className="text-lg font-black text-brand-black">24x7 Factory Shifts & Gatekeeper Biometrics</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Factories running continuous day, night, and rotational shifts often suffer from proxy punches, unverified overtime, and missed statutory compliances.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-600 uppercase">HBS Workspace Solution</span>
                  <h4 className="text-lg font-black text-brand-black">Dedicated Gate Terminal Mode</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Set up an inexpensive Android tablet at the security gate. Staff verify in under 300ms with liveness detection. Night shifts automatically attribute to the correct production calendar day.
                  </p>
                </div>
                <div className="rounded-2xl bg-neutral-900 p-5 text-white text-xs space-y-2">
                  <p className="font-bold text-amber-400">Key Factory Outcomes:</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> ₹45,000+ monthly savings in eliminated proxy punches</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Automated 1.5x / 2.0x overtime rate calculations</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Instant PDF wage slips for factory compliance audits</p>
                </div>
              </div>
            )}

            {activeIndustry === "RETAIL" && (
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-brand-red uppercase">Challenge: Distributed Stores</span>
                  <h4 className="text-lg font-black text-brand-black">Multi-Outlet Staff Attendance & Late Arrival</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Retail brands with 5-50 outlets face unauthorized staff absences, store managers covering for friends, and delayed salary settlements.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-600 uppercase">HBS Workspace Solution</span>
                  <h4 className="text-lg font-black text-brand-black">Strict GPS Geofence Scoping</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Staff can only punch in when their mobile or store iPad is within 150m of the outlet coordinates. Store managers approve local leave while HQ retains live central control.
                  </p>
                </div>
                <div className="rounded-2xl bg-neutral-900 p-5 text-white text-xs space-y-2">
                  <p className="font-bold text-amber-400">Key Retail Outcomes:</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Zero hardware purchase across 50+ stores</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Automated half-day deduction for late arrivals</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> 1-Click consolidated salary transfer across all stores</p>
                </div>
              </div>
            )}

            {activeIndustry === "HEALTHCARE" && (
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-brand-red uppercase">Challenge: 24/7 Coverage</span>
                  <h4 className="text-lg font-black text-brand-black">Emergency Swaps & Doctor Rosters</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Clinics and hospitals manage sensitive schedules where sudden doctor or nurse leaves require swift colleague swaps without creating payroll inaccuracies.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-600 uppercase">HBS Workspace Solution</span>
                  <h4 className="text-lg font-black text-brand-black">Colleague Shift Swapping Workflow</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Staff request a swap directly through their portal. The colleague accepts, the department head gets a 1-tap approval notification, and payroll adjustments update automatically.
                  </p>
                </div>
                <div className="rounded-2xl bg-neutral-900 p-5 text-white text-xs space-y-2">
                  <p className="font-bold text-amber-400">Key Healthcare Outcomes:</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Zero shift gaps in critical emergency wards</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Touchless facial verification (hygienic & safe)</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Complete audit trail of shift attribution & hours</p>
                </div>
              </div>
            )}

            {activeIndustry === "AGENCIES" && (
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-brand-red uppercase">Challenge: Tool Sprawl</span>
                  <h4 className="text-lg font-black text-brand-black">Sales CRM + Attendance in One Hub</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Digital agencies, consultancies, and software houses often juggle 4 separate tools for attendance, payroll slips, client deals, and IT asset tracking.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-600 uppercase">HBS Workspace Solution</span>
                  <h4 className="text-lg font-black text-brand-black">Integrated High-Velocity CRM + HR</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Sales reps track high-ticket deals, HR managers handle leaves, and accountants process monthly salary slips all within one high-performance interface.
                  </p>
                </div>
                <div className="rounded-2xl bg-neutral-900 p-5 text-white text-xs space-y-2">
                  <p className="font-bold text-amber-400">Key Agency Outcomes:</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Saved ₹30,000/mo by canceling redundant SaaS licenses</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Sales team realization tracking against payroll costs</p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Remote facial check-ins for field consultants</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Interactive ROI & Operational Savings Calculator */}
      <section id="calculator" className="py-24 bg-white border-t border-brand-border">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-red">
              Instant Business Impact
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
              Calculate Your Monthly Operational Savings
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-xs text-brand-muted">
              Adjust the sliders below to see how much time and money HBS Workspace saves your company every month.
            </p>
          </div>

          <div className="mt-12 rounded-3xl border border-brand-border bg-neutral-50 p-8 shadow-xl">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              {/* Sliders Input Column */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-black">
                      Total Employees in Company:
                    </label>
                    <span className="rounded-full bg-brand-black px-3 py-1 text-xs font-bold text-white">
                      {empSlider} Staff
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="5"
                    value={empSlider}
                    onChange={(e) => setEmpSlider(Number(e.target.value))}
                    className="mt-3 w-full accent-brand-red cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-brand-muted mt-1">
                    <span>10 Staff</span>
                    <span>250 Staff</span>
                    <span>500+ Staff</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-black">
                      Number of Branches / Units:
                    </label>
                    <span className="rounded-full bg-brand-black px-3 py-1 text-xs font-bold text-white">
                      {branchSlider} Branches
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={branchSlider}
                    onChange={(e) => setBranchSlider(Number(e.target.value))}
                    className="mt-3 w-full accent-brand-red cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-brand-muted mt-1">
                    <span>1 Branch</span>
                    <span>10 Branches</span>
                    <span>20 Branches</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 border border-brand-border text-xs text-brand-muted space-y-1.5 shadow-xs">
                  <p className="flex items-center gap-2 font-medium text-neutral-700">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    Zero hardware purchase or annual machine maintenance costs
                  </p>
                  <p className="flex items-center gap-2 font-medium text-neutral-700">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    Stops buddy punching & fake client sales visits permanently
                  </p>
                </div>
              </div>

              {/* Calculated Outputs Cards */}
              <div className="rounded-2xl bg-neutral-900 p-7 text-white space-y-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-red">
                    Estimated Monthly Savings
                  </span>
                  <p className="mt-1 text-4xl font-black text-white">
                    ₹{proxyMoneySaved.toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-normal text-neutral-400">/ month</span>
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Saved from eliminated buddy punching & automated error-free payroll math.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-5">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold">
                      Time Saved / Month
                    </span>
                    <p className="text-2xl font-bold text-emerald-400">~{hoursSaved} Hours</p>
                    <p className="text-[10px] text-neutral-500">In HR administrative work</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold">
                      Hardware Capital Saved
                    </span>
                    <p className="text-2xl font-bold text-blue-400">
                      ₹{hardwareSavings.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-neutral-500">Biometric machines not bought</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/login?register=1">
                    <Button variant="primary" className="w-full rounded-full py-3 text-xs font-bold shadow-md">
                      Claim Your Savings & Start Free Trial &rarr;
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials Infinite Marquee (Faithful to Reference Screenshots Images 2 & 3) */}
      <section id="testimonials" className="py-24 bg-neutral-50/80 border-t border-brand-border overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-left max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-red">
              Trusted By Indian Founders & Operations Leaders
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-black sm:text-5xl">
              Owners who stopped dreading salary day
            </h2>
            <p className="mt-4 text-base text-brand-muted">
              Real business owners sharing how HBS Workspace transformed their staff management and multi-branch operations.
            </p>
          </div>
        </div>

        {/* Dual-Row Infinite Scrolling Marquee with Edge Gradient Masks */}
        <div className="relative mt-12 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          {/* Row 1 - Leftward scrolling */}
          <div className="flex gap-6 animate-marquee py-3">
            {[...reviewsRow1, ...reviewsRow1].map((r, i) => (
              <div
                key={i}
                className="w-[380px] shrink-0 flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-xs hover:shadow-lg transition-all duration-200"
              >
                <div>
                  <div className="flex gap-1 text-amber-400 mb-4">
                    {[...Array(r.stars)].map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-neutral-700 font-medium">
                    “{r.quote}”
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-2xl ${r.avatarBg} text-xs font-bold text-white shadow-xs`}>
                      {r.initials}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-brand-black">{r.name}</h4>
                      <p className="text-[11px] text-brand-muted">{r.company}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${r.tagColor}`}>
                    {r.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Row 2 - Rightward scrolling */}
          <div className="mt-4 flex gap-6 animate-marquee-reverse py-3">
            {[...reviewsRow2, ...reviewsRow2].map((r, i) => (
              <div
                key={i}
                className="w-[380px] shrink-0 flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-xs hover:shadow-lg transition-all duration-200"
              >
                <div>
                  <div className="flex gap-1 text-amber-400 mb-4">
                    {[...Array(r.stars)].map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-neutral-700 font-medium">
                    “{r.quote}”
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-2xl ${r.avatarBg} text-xs font-bold text-white shadow-xs`}>
                      {r.initials}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-brand-black">{r.name}</h4>
                      <p className="text-[11px] text-brand-muted">{r.company}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${r.tagColor}`}>
                    {r.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section (Full Detail Breakdown) */}
      <section id="pricing" className="border-t border-brand-border bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-red">
              Transparent, Scalable Pricing
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
              Choose The Plan That Fits Your Organization
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-brand-muted">
              Every plan includes full HRM, in-browser AI face attendance, shift rosters, and payroll processing.
            </p>

            {/* Billing Toggle */}
            <div className="mt-8 inline-flex items-center rounded-full border border-brand-border bg-neutral-100 p-1.5 shadow-xs">
              <button
                type="button"
                onClick={() => setYearly(false)}
                className={`rounded-full px-6 py-2 text-xs font-bold transition ${
                  !yearly ? "bg-brand-black text-white shadow-xs" : "text-brand-muted hover:text-brand-black"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setYearly(true)}
                className={`flex items-center gap-1.5 rounded-full px-6 py-2 text-xs font-bold transition ${
                  yearly ? "bg-brand-black text-white shadow-xs" : "text-brand-muted hover:text-brand-black"
                }`}
              >
                Annual Billing
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {/* Starter Plan */}
            <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-white p-8 shadow-sm transition hover:shadow-md">
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

                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-black text-brand-black">
                    ₹{yearly ? "4,990" : "499"}
                  </span>
                  <span className="ml-1 text-xs font-semibold text-brand-muted">
                    /{yearly ? "year" : "month"}
                  </span>
                </div>

                <div className="mt-8 border-t border-brand-border pt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-black">
                    What's Included:
                  </p>
                  <ul className="mt-4 space-y-3 text-xs text-neutral-700">
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span><strong>1 Branch</strong> Office Managed</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Up to <strong>25 Active Employees</strong></span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span><strong>In-Browser Face Biometrics</strong> with Liveness</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>General & Morning Shifts</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Leave Tracking & Approvals</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Automated Monthly Payslips</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-brand-border">
                <Link href="/login?register=1">
                  <Button variant="outline" className="w-full rounded-full font-bold">
                    Start 14-Day Free Trial
                  </Button>
                </Link>
              </div>
            </div>

            {/* Business Plan (Highlighted / Most Popular) */}
            <div className="relative flex flex-col justify-between rounded-3xl border-2 border-brand-red bg-white p-8 shadow-xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-red px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm">
                Most Popular
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-brand-black">Business</h3>
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-brand-red">
                    Growing Multi-Branch
                  </span>
                </div>
                <p className="mt-2 text-xs text-brand-muted">
                  Full multi-branch operations, rotational shifts & sales CRM.
                </p>

                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-black text-brand-black">
                    ₹{yearly ? "14,990" : "1,499"}
                  </span>
                  <span className="ml-1 text-xs font-semibold text-brand-muted">
                    /{yearly ? "year" : "month"}
                  </span>
                </div>

                <div className="mt-8 border-t border-brand-border pt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-black">
                    Everything in Starter, plus:
                  </p>
                  <ul className="mt-4 space-y-3 text-xs text-neutral-700">
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-brand-red shrink-0" />
                      <span>Up to <strong>5 Branch Offices</strong></span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-brand-red shrink-0" />
                      <span>Up to <strong>100 Active Employees</strong></span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-brand-red shrink-0" />
                      <span><strong>Rotational & Night Shifts</strong> (Safe Work Date)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-brand-red shrink-0" />
                      <span><strong>Full CRM Pipeline</strong> (Deals, Leads, Activities)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-brand-red shrink-0" />
                      <span>Statutory <strong>PF/ESI/PT/OT</strong> Payroll Engine</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-brand-red shrink-0" />
                      <span>GPS Geofencing with Branch Radius</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-brand-red shrink-0" />
                      <span>Expense Claims & Asset Tracking</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-brand-border">
                <Link href="/login?register=1">
                  <Button variant="primary" className="w-full rounded-full font-bold shadow-md">
                    Launch Business Workspace
                  </Button>
                </Link>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-white p-8 shadow-sm transition hover:shadow-md">
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

                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-black text-brand-black">
                    ₹{yearly ? "49,990" : "4,999"}
                  </span>
                  <span className="ml-1 text-xs font-semibold text-brand-muted">
                    /{yearly ? "year" : "month"}
                  </span>
                </div>

                <div className="mt-8 border-t border-brand-border pt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-black">
                    Everything in Business, plus:
                  </p>
                  <ul className="mt-4 space-y-3 text-xs text-neutral-700">
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Up to <strong>50 Branch Offices</strong></span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Up to <strong>1,000+ Employees</strong></span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Unlimited Custom Shift Patterns & Rotations</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Full 150+ Granular RBAC Permissions Matrix</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>IT Helpdesk & Candidate Recruitment Pipelines</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Priority Support with 99.9% Uptime SLA</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-brand-border">
                <Link href="/login?register=1">
                  <Button variant="dark" className="w-full rounded-full font-bold">
                    Deploy Enterprise Edition
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Deep Feature Comparison Table */}
          <div className="mt-16 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-xs">
            <div className="border-b border-brand-border bg-neutral-50 p-6">
              <h3 className="text-lg font-black text-brand-black">
                Detailed Module & Capability Comparison
              </h3>
              <p className="text-xs text-brand-muted">
                Side-by-side feature comparison across all subscription plans.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-border bg-neutral-100/60 font-bold text-brand-black">
                    <th className="p-4">Capability / Module</th>
                    <th className="p-4">Starter</th>
                    <th className="p-4 text-brand-red">Business</th>
                    <th className="p-4">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border text-neutral-700">
                  <tr>
                    <td className="p-4 font-semibold text-brand-black">Maximum Branch Offices</td>
                    <td className="p-4">1 Branch</td>
                    <td className="p-4 font-semibold text-brand-red">5 Branches</td>
                    <td className="p-4 font-bold text-brand-black">50 Branches</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-brand-black">Employee User Limit</td>
                    <td className="p-4">Up to 25 Staff</td>
                    <td className="p-4 font-semibold text-brand-red">Up to 100 Staff</td>
                    <td className="p-4 font-bold text-brand-black">1,000+ Staff</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-brand-black">AI Face Biometric Liveness</td>
                    <td className="p-4"><Check className="h-4 w-4 text-emerald-600" /></td>
                    <td className="p-4"><Check className="h-4 w-4 text-brand-red" /></td>
                    <td className="p-4"><Check className="h-4 w-4 text-emerald-600" /></td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-brand-black">Shift Types Supported</td>
                    <td className="p-4">General / Morning</td>
                    <td className="p-4 font-semibold text-brand-red">All (Morning, Evening, Night, Rotational, Split)</td>
                    <td className="p-4 font-bold text-brand-black">Unlimited Custom Shifts</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-brand-black">Colleague Shift Swapping</td>
                    <td className="p-4 text-neutral-400">—</td>
                    <td className="p-4"><Check className="h-4 w-4 text-brand-red" /></td>
                    <td className="p-4"><Check className="h-4 w-4 text-emerald-600" /></td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-brand-black">CRM Deals & Pipeline Kanban</td>
                    <td className="p-4 text-neutral-400">—</td>
                    <td className="p-4"><Check className="h-4 w-4 text-brand-red" /></td>
                    <td className="p-4"><Check className="h-4 w-4 text-emerald-600" /></td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-brand-black">Statutory Payroll (PF/ESI/PT)</td>
                    <td className="p-4">Basic Payslips</td>
                    <td className="p-4 font-semibold text-brand-red">Full Statutory Engine</td>
                    <td className="p-4 font-bold text-brand-black">Full Statutory + Bank CSV Export</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-brand-black">Expenses & IT Asset Management</td>
                    <td className="p-4 text-neutral-400">—</td>
                    <td className="p-4"><Check className="h-4 w-4 text-brand-red" /></td>
                    <td className="p-4"><Check className="h-4 w-4 text-emerald-600" /></td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-brand-black">Recruitment & Internal Helpdesk</td>
                    <td className="p-4 text-neutral-400">—</td>
                    <td className="p-4 text-neutral-400">—</td>
                    <td className="p-4"><Check className="h-4 w-4 text-emerald-600" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Security & DPDP Compliance Trust Center */}
      <section className="border-t border-brand-border bg-neutral-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <span className="rounded-full bg-brand-red/20 px-3 py-1 text-xs font-bold uppercase text-brand-red">
                Bank-Grade Security Architecture
              </span>
              <h2 className="mt-4 text-2xl font-black text-white sm:text-3xl">
                Encrypted Biometrics & Privacy You Can Trust
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                We believe employee biometric privacy is non-negotiable. HBS Workspace never stores raw camera pictures on disks or databases.
              </p>
              <div className="mt-6 space-y-3 text-xs text-neutral-300">
                <div className="flex items-start gap-3">
                  <Lock className="h-4 w-4 text-brand-red shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">AES-256-GCM Vault:</strong> Vector descriptors are encrypted with unique cryptographic keys stored in secure environment secrets.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">India DPDP Act 2023 Compliant:</strong> Explicit employee biometric consent tracking and full audit trails for every punch event.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Sub-300ms Verification:</strong> Local vector calculations happen directly inside the browser using optimized WebGL shaders.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-3">
                Security Compliance Checklist
              </h4>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900">
                  <span className="text-neutral-300">Zero Raw Photo Storage</span>
                  <span className="text-emerald-400 font-bold">ENFORCED</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900">
                  <span className="text-neutral-300">Biometric Vector Encryption</span>
                  <span className="text-emerald-400 font-bold">AES-256-GCM</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900">
                  <span className="text-neutral-300">Data Transmission Encryption</span>
                  <span className="text-emerald-400 font-bold">TLS 1.3 Strict</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900">
                  <span className="text-neutral-300">Multi-Tenancy Row-Level Scoping</span>
                  <span className="text-emerald-400 font-bold">ISOLATED</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900">
                  <span className="text-neutral-300">Financial Calculation Engine</span>
                  <span className="text-emerald-400 font-bold">Integer-Paise Precision</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions (Accordion) */}
      <section id="faq" className="py-24 bg-white border-t border-brand-border">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-red">
              Got Questions?
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-xs text-brand-muted">
              Everything you need to know about setting up HBS Workspace for your team.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between text-left text-sm font-bold text-brand-black"
                  >
                    <span>{f.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-brand-muted transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180 text-brand-red" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-xs leading-relaxed text-neutral-600 border-t border-brand-border pt-3">
                      {f.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ready To Start CTA Banner */}
      <section className="bg-brand-black py-20 text-white text-center">
        <div className="mx-auto max-w-4xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-4 py-1.5 text-xs font-bold text-neutral-300 mb-6">
            <Sparkles className="h-4 w-4 text-brand-red" />
            <span>Join Over 2,500+ High-Growth Companies</span>
          </div>

          <h2 className="text-3xl font-black sm:text-5xl">
            Upgrade Your Entire Workforce To HBS Workspace
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-neutral-400 leading-relaxed">
            Eliminate manual registers, buddy punching, and chaotic payroll Excel sheets today. Set up in less than 2 minutes.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3.5 sm:flex-row sm:items-center">
            <Link href="/login?register=1">
              <Button variant="primary" className="h-12 rounded-full px-8 text-base font-bold shadow-xl shadow-red-500/25">
                Create Free Company Workspace &rarr;
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="h-12 rounded-full border-neutral-700 bg-transparent px-7 text-black hover:text-white hover:bg-neutral-900 font-bold">
                Sign In With Demo Accounts
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-border bg-white py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 pb-12 border-b border-brand-border">
            <div className="lg:col-span-2 space-y-4">
              <Logo h={40} />
              <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
                HBS Workspace is India's most advanced facial AI-powered HRM and CRM operating system, built to eliminate buddy punching, optimize shift rosters, and streamline multi-branch enterprise payroll.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                All Systems Operational • SOC-2 Type II Certified
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-black">Product</h4>
              <ul className="mt-3 space-y-2 text-xs text-neutral-500">
                <li><a href="#biometrics" className="hover:text-brand-black">In-Browser Face AI</a></li>
                <li><a href="#interactive-tour" className="hover:text-brand-black">Rotational Shift Rosters</a></li>
                <li><a href="#interactive-tour" className="hover:text-brand-black">Statutory PF/ESI Payroll</a></li>
                <li><a href="#interactive-tour" className="hover:text-brand-black">Sales CRM Pipelines</a></li>
                <li><a href="#interactive-tour" className="hover:text-brand-black">Multi-Branch Scoping</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-black">Industries</h4>
              <ul className="mt-3 space-y-2 text-xs text-neutral-500">
                <li><a href="#industries" className="hover:text-brand-black">Manufacturing & Factories</a></li>
                <li><a href="#industries" className="hover:text-brand-black">Retail & Chain Stores</a></li>
                <li><a href="#industries" className="hover:text-brand-black">Hospitals & Clinics</a></li>
                <li><a href="#industries" className="hover:text-brand-black">Tech & Digital Agencies</a></li>
                <li><a href="#industries" className="hover:text-brand-black">Logistics & Warehouses</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-black">Company</h4>
              <ul className="mt-3 space-y-2 text-xs text-neutral-500">
                <li><Link href="/login" className="hover:text-brand-black">Demo Logins</Link></li>
                <li><Link href="/login?register=1" className="hover:text-brand-black">Register Organization</Link></li>
                <li><a href="#pricing" className="hover:text-brand-black">Pricing Plans</a></li>
                <li><a href="#calculator" className="hover:text-brand-black">ROI Calculator</a></li>
                <li><a href="#faq" className="hover:text-brand-black">Support & Helpdesk</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 text-xs text-brand-muted sm:flex-row">
            <span>
              © {new Date().getFullYear()} HBS Workspace — A Hover Business Services Brand. All rights reserved.
            </span>
            <div className="flex gap-6">
              <span className="hover:text-brand-black cursor-pointer">Privacy Policy</span>
              <span className="hover:text-brand-black cursor-pointer">Terms of Service</span>
              <span className="hover:text-brand-black cursor-pointer">Security Vault</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Help Bubble (Faithful to Image 1 Hover Business Services LLC) */}
      <a
        href="https://wa.me/919999999999?text=Hello%20HBS%20Workspace,%20I%20would%20like%20a%20demo"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 left-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-[#25D366] text-white shadow-2xl transition hover:scale-110 active:scale-95 group"
      >
        <span className="absolute -inset-1 rounded-full bg-[#25D366] opacity-40 animate-ping pointer-events-none" />
        <WhatsAppLogo className="h-7 w-7 text-white" />
        <span className="absolute left-16 hidden rounded-lg bg-neutral-900 px-3 py-1 text-xs font-bold text-white whitespace-nowrap shadow-md group-hover:block">
          Chat on WhatsApp
        </span>
      </a>

      {/* Floating Instant AI Bot Assistant (Faithful to Image 1 Hover Business Services LLC) */}
      <Link
        href="/login?register=1"
        aria-label="Ask HBS AI Assistant"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-[#FF6B35] text-white shadow-2xl transition hover:scale-110 active:scale-95 shadow-orange-500/30 group"
      >
        <span className="absolute -inset-1 rounded-full bg-[#FF6B35] opacity-40 animate-ping pointer-events-none" />
        <RobotBotLogo className="h-7 w-7 text-white" />
        <span className="absolute right-16 hidden rounded-lg bg-neutral-900 px-3 py-1 text-xs font-bold text-white whitespace-nowrap shadow-md group-hover:block">
          Ask HBS AI Assistant
        </span>
      </Link>
    </div>
  );
}
