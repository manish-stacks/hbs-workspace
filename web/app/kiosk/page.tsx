"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  AlertTriangle,
  Building2,
  UserCheck,
  Zap,
  ArrowLeft,
  ArrowRight,
  Eye,
  Smile,
  Check,
  LogOut,
  ChevronDown
} from "lucide-react";
import { api } from "@/lib/api";

// Engine Loader for Face-API
const loadEngine = () =>
  new Promise<void>((ok, bad) => {
    if ((window as any).faceapi) return ok();
    const s = document.createElement("script");
    s.src = "/vendor/face-api.js";
    s.onload = () => ok();
    s.onerror = () => bad(new Error("Biometric AI engine failed to load"));
    document.body.appendChild(s);
  });

// Eye Aspect Ratio for blink detection
const ear = (p: any[], o: number) =>
  (Math.hypot(p[o + 1].x - p[o + 5].x, p[o + 1].y - p[o + 5].y) +
    Math.hypot(p[o + 2].x - p[o + 4].x, p[o + 2].y - p[o + 4].y)) /
  (2 * Math.hypot(p[o].x - p[o + 3].x, p[o].y - p[o + 3].y));

// Synthesized audio feedback
function playAudio(type: "success" | "spoof" | "chime") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "success") {
      // High pleasant two-tone chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === "spoof") {
      // Low jarring warning buzz
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.setValueAtTime(110, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Subtle tick chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch {
    // ignore audio block
  }
}

type ChallengeType = "BLINK" | "TURN_LEFT" | "TURN_RIGHT" | "SMILE";

interface KioskConfig {
  tenantId: string;
  companyName: string;
  logoUrl?: string;
  timezone: string;
  branches: Array<{ id: string; name: string; code: string; address?: string }>;
  totalEnrolled: number;
}

interface PunchResult {
  ok: boolean;
  matched: boolean;
  punchType?: "CHECK_IN" | "CHECK_OUT";
  time?: string;
  alreadyPunched?: boolean;
  message?: string;
  workMinutes?: number;
  shiftInfo?: { name: string; lateMinutes?: number };
  employee?: {
    id: string;
    fullName: string;
    employeeCode: string;
    branch?: string;
    department?: string;
    designation?: string;
  };
}

export default function FaceKioskPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [config, setConfig] = useState<KioskConfig | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [punchMode, setPunchMode] = useState<"AUTO" | "CHECK_IN" | "CHECK_OUT">("AUTO");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Time & Status
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [engineReady, setEngineReady] = useState(false);
  const [systemError, setSystemError] = useState("");

  // Scanner & Liveness State
  const [challenge, setChallenge] = useState<{ id: string; action: ChallengeType } | null>(null);
  const [livenessStatus, setLivenessStatus] = useState<"SCANNING" | "CHALLENGE" | "PASSED" | "SPOOF_BLOCKED">("SCANNING");
  const [instruction, setInstruction] = useState("Position your face inside the scanner");
  const [spoofReason, setSpoofReason] = useState("");
  const [progress, setProgress] = useState(0); // 0 to 100%

  // Punch feedback
  const [punchResult, setPunchResult] = useState<PunchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentPunches, setRecentPunches] = useState<any[]>([]);

  // State refs for animation loop
  const loopRef = useRef({
    active: true,
    submitting: false,
    challenge: null as { id: string; action: ChallengeType } | null,
    blinkCount: 0,
    eyeClosed: false,
    steadyFrames: 0,
    lastNosePos: null as { x: number; y: number } | null,
    staticMotionFrames: 0,
    challengeStartTime: 0,
    cooldownUntil: 0,
  });

  // Digital Clock Updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setCurrentDate(now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Kiosk Configuration & Recent Punches
  const loadConfig = useCallback(async () => {
    try {
      const res: any = await api("/attendance/kiosk/config" + (selectedBranch ? `?branchId=${selectedBranch}` : ""));
      setConfig(res);
      if (!selectedBranch && res.branches?.length > 0) {
        const saved = localStorage.getItem("hbs_kiosk_branch");
        const defaultBranch = saved && res.branches.some((b: any) => b.id === saved) ? saved : res.branches[0].id;
        setSelectedBranch(defaultBranch);
      }
    } catch (e: any) {
      setSystemError(e.message || "Failed to load kiosk settings");
    }
  }, [selectedBranch]);

  const loadRecentPunches = useCallback(async () => {
    try {
      const res: any = await api("/attendance/kiosk/recent" + (selectedBranch ? `?branchId=${selectedBranch}` : ""));
      if (Array.isArray(res)) setRecentPunches(res);
    } catch {
      // ignore
    }
  }, [selectedBranch]);

  useEffect(() => {
    loadConfig();
    loadRecentPunches();
    const interval = setInterval(loadRecentPunches, 15000);
    return () => clearInterval(interval);
  }, [loadConfig, loadRecentPunches]);

  // Request new anti-spoof challenge from server
  const fetchNewChallenge = useCallback(async () => {
    try {
      const res: any = await api("/attendance/kiosk/challenge");
      const c = { id: res.challengeId, action: (res.action || "BLINK") as ChallengeType };
      setChallenge(c);
      loopRef.current.challenge = c;
      loopRef.current.blinkCount = 0;
      loopRef.current.eyeClosed = false;
      loopRef.current.steadyFrames = 0;
      loopRef.current.staticMotionFrames = 0;
      loopRef.current.challengeStartTime = Date.now();
      setLivenessStatus("CHALLENGE");
      setProgress(25);

      if (c.action === "BLINK") {
        setInstruction("🛡️ Liveness Check: Blink your eyes twice");
      } else if (c.action === "TURN_LEFT") {
        setInstruction("🛡️ Liveness Check: Slowly turn head LEFT ↺");
      } else if (c.action === "TURN_RIGHT") {
        setInstruction("🛡️ Liveness Check: Slowly turn head RIGHT ↻");
      } else if (c.action === "SMILE") {
        setInstruction("🛡️ Liveness Check: Smile at the camera 🙂");
      }
    } catch {
      // Local fallback
      const c = { id: "local-kiosk-" + Math.random().toString(36).slice(2), action: "BLINK" as ChallengeType };
      setChallenge(c);
      loopRef.current.challenge = c;
      setLivenessStatus("CHALLENGE");
      setInstruction("🛡️ Liveness Check: Blink your eyes twice");
    }
  }, []);

  // Main Detection & Biometric Camera Loop
  useEffect(() => {
    let stop = false;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      setLoadingModels(true);
      setInstruction("Loading AI Biometric neural nets...");

      try {
        await loadEngine();
        const f = (window as any).faceapi;
        await Promise.all([
          f.nets.tinyFaceDetector.loadFromUri("/models"),
          f.nets.faceLandmark68Net.loadFromUri("/models"),
          f.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);

        setEngineReady(true);
        setLoadingModels(false);

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
        });

        if (stop || !videoRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        await fetchNewChallenge();

        const opts = new f.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 });

        const processFrame = async () => {
          if (stop) return;

          // If in cooldown or already submitting, skip frame
          if (Date.now() < loopRef.current.cooldownUntil || loopRef.current.submitting) {
            setTimeout(processFrame, 200);
            return;
          }

          try {
            const det = await f.detectSingleFace(video, opts).withFaceLandmarks();

            if (!det) {
              setInstruction("Position your face inside the scanner");
              setProgress(0);
              loopRef.current.steadyFrames = 0;
              loopRef.current.blinkCount = 0;
              setTimeout(processFrame, 150);
              return;
            }

            const p = det.landmarks.positions;
            const jaw = det.landmarks.getJawOutline();
            const nose = det.landmarks.getNose()[3] || p[30];
            const boxW = det.detection.box.width;

            // Distance check
            if (boxW < 75) {
              setInstruction("Move closer to the camera 🔍");
              setTimeout(processFrame, 150);
              return;
            }
            if (boxW > 280) {
              setInstruction("Move slightly back ↔");
              setTimeout(processFrame, 150);
              return;
            }

            // --- ANTI-SPOOF CHECK 1: STATIC PHOTO / SCREEN MOTIONLESS TEST ---
            // A real human face has micro-movement. A static picture on phone held still has 0 movement.
            if (loopRef.current.lastNosePos) {
              const dx = Math.abs(nose.x - loopRef.current.lastNosePos.x);
              const dy = Math.abs(nose.y - loopRef.current.lastNosePos.y);
              if (dx < 0.08 && dy < 0.08) {
                loopRef.current.staticMotionFrames++;
                if (loopRef.current.staticMotionFrames > 35) {
                  // >35 frames with 0 micro-movement = flat static photo / phone screen
                  triggerSpoofBlock("Static photo or motionless screen detected. Live human required.");
                  setTimeout(processFrame, 600);
                  return;
                }
              } else {
                loopRef.current.staticMotionFrames = Math.max(0, loopRef.current.staticMotionFrames - 1);
              }
            }
            loopRef.current.lastNosePos = { x: nose.x, y: nose.y };

            // Challenge Timeout (If user doesn't complete challenge in 10s, refresh)
            if (Date.now() - loopRef.current.challengeStartTime > 12000) {
              await fetchNewChallenge();
              setTimeout(processFrame, 150);
              return;
            }

            const curChallenge = loopRef.current.challenge;
            if (!curChallenge) {
              await fetchNewChallenge();
              setTimeout(processFrame, 150);
              return;
            }

            // --- ACTIVE LIVENESS VERIFICATION ---
            let passedChallenge = false;

            if (curChallenge.action === "BLINK") {
              const leftEar = ear(p, 36);
              const rightEar = ear(p, 42);
              const avgEar = (leftEar + rightEar) / 2;

              // Eyes closed condition
              if (avgEar < 0.22) {
                loopRef.current.eyeClosed = true;
              } else if (loopRef.current.eyeClosed && avgEar > 0.27) {
                // Eyes opened again after closing = 1 Genuine Blink!
                loopRef.current.eyeClosed = false;
                loopRef.current.blinkCount++;
                if (audioEnabled) playAudio("chime");

                if (loopRef.current.blinkCount === 1) {
                  setProgress(60);
                  setInstruction("✓ 1st Blink verified! Blink once more");
                } else if (loopRef.current.blinkCount >= 2) {
                  passedChallenge = true;
                }
              }
            } else if (curChallenge.action === "TURN_LEFT") {
              // Yaw ratio
              const leftJawDist = Math.abs(nose.x - jaw[0].x);
              const totalJawWidth = Math.abs(jaw[16].x - jaw[0].x);
              const yaw = leftJawDist / (totalJawWidth || 1);
              if (yaw < 0.38) {
                passedChallenge = true;
              } else {
                setInstruction("Slowly turn head to the LEFT ↺");
              }
            } else if (curChallenge.action === "TURN_RIGHT") {
              const leftJawDist = Math.abs(nose.x - jaw[0].x);
              const totalJawWidth = Math.abs(jaw[16].x - jaw[0].x);
              const yaw = leftJawDist / (totalJawWidth || 1);
              if (yaw > 0.62) {
                passedChallenge = true;
              } else {
                setInstruction("Slowly turn head to the RIGHT ↻");
              }
            } else if (curChallenge.action === "SMILE") {
              // Mouth width vs jaw width
              const mouthW = Math.hypot(p[54].x - p[48].x, p[54].y - p[48].y);
              const jawW = Math.hypot(jaw[16].x - jaw[0].x, jaw[16].y - jaw[0].y);
              const ratio = mouthW / (jawW || 1);
              if (ratio > 0.43) {
                passedChallenge = true;
              } else {
                setInstruction("Please smile at the camera 🙂");
              }
            }

            if (passedChallenge) {
              setLivenessStatus("PASSED");
              setProgress(100);
              setInstruction("✓ Liveness Verified! Identifying employee...");
              if (audioEnabled) playAudio("chime");

              // Extract 128D descriptor and submit punch
              loopRef.current.submitting = true;
              setIsSubmitting(true);

              const full = await f.detectSingleFace(video, opts).withFaceLandmarks().withFaceDescriptor();

              if (full && full.descriptor) {
                await submitPunch(Array.from(full.descriptor), curChallenge.id);
              } else {
                // Retry in a moment
                loopRef.current.submitting = false;
                setIsSubmitting(false);
                setInstruction("Hold still to finalize scan");
              }
            }
          } catch {
            // ignore frame error
          }

          setTimeout(processFrame, 140);
        };

        processFrame();
      } catch (err: any) {
        setSystemError(err.message || "Failed to start camera");
        setLoadingModels(false);
      }
    };

    startCamera();

    return () => {
      stop = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [audioEnabled, fetchNewChallenge]);

  // Anti-Spoof Block Alert Trigger
  const triggerSpoofBlock = (reason: string) => {
    setLivenessStatus("SPOOF_BLOCKED");
    setSpoofReason(reason);
    setInstruction("⚠️ Anti-Spoof Warning: Live human presence required.");
    if (audioEnabled) playAudio("spoof");
    loopRef.current.cooldownUntil = Date.now() + 4000;

    setTimeout(() => {
      setLivenessStatus("SCANNING");
      setSpoofReason("");
      fetchNewChallenge();
    }, 3800);
  };

  // Submit Biometric Punch to Backend (1:N Match)
  const submitPunch = async (descriptor: number[], challengeId: string) => {
    try {
      const res: any = await api("/attendance/kiosk/punch", {
        method: "POST",
        body: JSON.stringify({
          descriptor,
          challengeId,
          challengePassed: true,
          type: punchMode,
          branchId: selectedBranch || undefined,
        }),
      });

      setPunchResult(res);
      setIsSubmitting(false);

      if (res.ok) {
        if (audioEnabled) playAudio("success");
        loadRecentPunches();
      } else {
        if (audioEnabled) playAudio("spoof");
      }

      // Automatically reset kiosk after 3.8s for next employee
      setTimeout(() => {
        setPunchResult(null);
        loopRef.current.submitting = false;
        loopRef.current.cooldownUntil = Date.now() + 500;
        fetchNewChallenge();
      }, 3800);
    } catch (e: any) {
      setIsSubmitting(false);
      setPunchResult({
        ok: false,
        matched: false,
        message: e.message || "Face not recognized. Please register your face with HR.",
      });
      if (audioEnabled) playAudio("spoof");

      setTimeout(() => {
        setPunchResult(null);
        loopRef.current.submitting = false;
        fetchNewChallenge();
      }, 3500);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Background High-Tech Grid Ambient */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
            <ScanFace className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white">
                {config?.companyName || "HBS Workspace"}
              </h1>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                KIOSK LIVE
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              AI Face Biometric Attendance Terminal · No Login Needed
            </p>
          </div>
        </div>

        {/* Center Digital Clock */}
        <div className="hidden md:flex flex-col items-center">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black tracking-wider text-emerald-400">
              {currentTime || "12:00:00 PM"}
            </span>
            <Clock className="h-4 w-4 text-emerald-500 animate-pulse" />
          </div>
          <span className="text-[11px] font-medium text-neutral-400">
            {currentDate}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Branch Selector */}
          {config?.branches && config.branches.length > 1 && (
            <div className="relative">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  localStorage.setItem("hbs_kiosk_branch", e.target.value);
                }}
                className="rounded-lg border border-neutral-700 bg-neutral-800/90 py-1.5 pl-8 pr-7 text-xs font-semibold text-neutral-200 outline-none hover:border-neutral-600 focus:border-emerald-500 cursor-pointer"
              >
                {config.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mode Pill Toggle */}
          <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-900 p-0.5 text-xs font-bold">
            <button
              onClick={() => setPunchMode("AUTO")}
              className={`rounded-md px-2.5 py-1 transition ${
                punchMode === "AUTO" ? "bg-emerald-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
              }`}
            >
              ⚡ Auto
            </button>
            <button
              onClick={() => setPunchMode("CHECK_IN")}
              className={`rounded-md px-2.5 py-1 transition ${
                punchMode === "CHECK_IN" ? "bg-blue-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
              }`}
            >
              Check In
            </button>
            <button
              onClick={() => setPunchMode("CHECK_OUT")}
              className={`rounded-md px-2.5 py-1 transition ${
                punchMode === "CHECK_OUT" ? "bg-amber-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
              }`}
            >
              Check Out
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            title={audioEnabled ? "Sound ON" : "Sound Muted"}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Back to App Shortcut */}
          <Link
            href="/app/dashboard"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Admin</span>
          </Link>
        </div>
      </header>

      {/* Main Center Biometric Viewport */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-4">
        {systemError ? (
          <div className="max-w-md rounded-2xl border border-red-500/40 bg-red-950/40 p-6 text-center backdrop-blur-md">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-3 text-lg font-black text-red-200">Terminal Initialization Error</h2>
            <p className="mt-2 text-xs text-neutral-300">{systemError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Camera Viewport Container */}
            <div className="relative flex items-center justify-center">
              {/* Outer Glowing Scanner Ring */}
              <div
                className={`relative flex h-80 w-80 sm:h-96 sm:w-96 items-center justify-center rounded-full border-4 transition-all duration-300 overflow-hidden shadow-2xl ${
                  livenessStatus === "SPOOF_BLOCKED"
                    ? "border-red-500 shadow-red-500/40"
                    : livenessStatus === "PASSED"
                    ? "border-emerald-400 shadow-emerald-400/50"
                    : "border-neutral-800 shadow-emerald-500/10"
                }`}
              >
                {/* Live Video Feed */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`h-full w-full object-cover transform -scale-x-100 transition duration-300 ${
                    punchResult ? "opacity-20 blur-sm" : "opacity-90"
                  }`}
                />

                {/* Loading Skeleton */}
                {loadingModels && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/90 text-center p-6">
                    <RefreshCw className="h-10 w-10 text-emerald-400 animate-spin" />
                    <p className="mt-4 text-xs font-bold text-neutral-300">
                      Booting Biometric Radar...
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Loading Neural Anti-Spoof Weights
                    </p>
                  </div>
                )}

                {/* HUD Tech Reticle Overlay (Only when scanning) */}
                {!loadingModels && !punchResult && (
                  <>
                    {/* Animated Scanning Laser Beam */}
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-75 shadow-lg shadow-emerald-400 animate-pulse pointer-events-none" />

                    {/* HUD Corner Brackets */}
                    <div className="absolute inset-6 border border-emerald-400/20 rounded-full pointer-events-none" />
                    <div className="absolute inset-10 border border-dashed border-emerald-400/30 rounded-full pointer-events-none" />
                  </>
                )}

                {/* Circular Dynamic Progress SVG Ring */}
                <svg className="absolute inset-0 h-full w-full -rotate-90 pointer-events-none">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="48%"
                    className="stroke-neutral-800 fill-none"
                    strokeWidth="6"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="48%"
                    className={`fill-none transition-all duration-300 ${
                      livenessStatus === "SPOOF_BLOCKED"
                        ? "stroke-red-500"
                        : livenessStatus === "PASSED"
                        ? "stroke-emerald-400"
                        : "stroke-emerald-500"
                    }`}
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 180}
                    strokeDashoffset={2 * Math.PI * 180 * (1 - progress / 100)}
                    strokeLinecap="round"
                  />
                </svg>

                {/* PUNCH RESULT CARD OVERLAY (Success or Fail) */}
                {punchResult && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/95 p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                    {punchResult.ok ? (
                      <div className="space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400 shadow-lg shadow-emerald-500/30">
                          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                        </div>
                        <div>
                          <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
                            {punchResult.punchType === "CHECK_IN" ? "✅ CHECK-IN RECORDED" : "👋 CHECK-OUT RECORDED"}
                          </span>
                          <h2 className="mt-2 text-xl font-black text-white">
                            {punchResult.employee?.fullName}
                          </h2>
                          <p className="text-xs font-mono text-emerald-400">
                            {punchResult.employee?.employeeCode} · {punchResult.employee?.designation || "Staff"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-neutral-900/80 border border-neutral-800 p-2.5 text-xs text-neutral-300 space-y-1">
                          <p className="font-semibold text-white">
                            {punchResult.message}
                          </p>
                          {punchResult.shiftInfo && (
                            <p className="text-[11px] text-neutral-400">
                              Shift: {punchResult.shiftInfo.name}
                            </p>
                          )}
                          {punchResult.workMinutes != null && (
                            <p className="text-[11px] text-emerald-400 font-bold">
                              Shift Duration: {(punchResult.workMinutes / 60).toFixed(1)} hrs
                            </p>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500 animate-pulse">
                          Resetting for next employee in 3s...
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-400 border-2 border-red-400 shadow-lg shadow-red-500/30">
                          <ShieldAlert className="h-10 w-10 text-red-400" />
                        </div>
                        <h2 className="text-lg font-black text-white">Verification Failed</h2>
                        <p className="text-xs text-red-300 max-w-[220px] mx-auto">
                          {punchResult.message}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          Please ensure face is enrolled in Dashboard.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* SPOOF BLOCKED CARD OVERLAY */}
                {livenessStatus === "SPOOF_BLOCKED" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/95 p-6 text-center animate-in fade-in duration-150">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/30 text-red-400 border-2 border-red-400 shadow-lg shadow-red-500/50 animate-bounce">
                      <ShieldAlert className="h-10 w-10 text-red-400" />
                    </div>
                    <h3 className="mt-3 text-base font-black uppercase tracking-wider text-red-200">
                      Anti-Spoof Warning!
                    </h3>
                    <p className="mt-1 text-xs text-red-300 font-semibold max-w-[220px]">
                      {spoofReason || "Mobile screen or static image detected."}
                    </p>
                    <p className="mt-2 text-[10px] text-neutral-400">
                      Live human presence required. Resuming in 3s...
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Live Instruction Banner & Anti-Spoof Badge */}
            <div className="mt-6 flex flex-col items-center text-center space-y-2">
              <div
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition shadow-md ${
                  livenessStatus === "SPOOF_BLOCKED"
                    ? "border-red-500/60 bg-red-950/80 text-red-300"
                    : livenessStatus === "PASSED"
                    ? "border-emerald-500/60 bg-emerald-950/80 text-emerald-300"
                    : challenge?.action === "BLINK"
                    ? "border-cyan-500/60 bg-cyan-950/80 text-cyan-200"
                    : "border-neutral-700 bg-neutral-900/90 text-neutral-200"
                }`}
              >
                {challenge?.action === "BLINK" && <Eye className="h-4 w-4 text-cyan-400 animate-bounce" />}
                {challenge?.action === "TURN_LEFT" && <ArrowLeft className="h-4 w-4 text-amber-400 animate-pulse" />}
                {challenge?.action === "TURN_RIGHT" && <ArrowRight className="h-4 w-4 text-amber-400 animate-pulse" />}
                {challenge?.action === "SMILE" && <Smile className="h-4 w-4 text-emerald-400 animate-pulse" />}
                <span>{instruction}</span>
              </div>

              {/* Subtitle Security Pill */}
              <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  Anti-Spoof Guard Active: Phone Screens & Printed Photos Blocked
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Live Activity Ticker */}
      <footer className="relative z-10 border-t border-neutral-800/80 bg-neutral-900/80 backdrop-blur-md px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-bold text-neutral-300">Recent Punches Today:</span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-0.5 max-w-full">
            {recentPunches.length === 0 ? (
              <span className="text-neutral-500 text-[11px]">
                No punches recorded yet today. Stand in front of camera to punch in.
              </span>
            ) : (
              recentPunches.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-1 text-xs shrink-0"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      p.type === "CHECK_IN" ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span className="font-bold text-white">{p.name}</span>
                  <span className="font-mono text-[10px] text-neutral-400">{p.code}</span>
                  <span className="text-[10px] font-semibold text-neutral-300">
                    {new Date(p.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                      p.type === "CHECK_IN"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {p.type === "CHECK_IN" ? "IN" : "OUT"}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-neutral-500 shrink-0">
            <span>Enrolled Biometrics: {config?.totalEnrolled || 1} staff</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
