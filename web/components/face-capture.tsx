"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { 
  Check, 
  CheckCircle2, 
  Camera, 
  Sparkles, 
  RotateCcw, 
  ScanFace, 
  Zap, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight,
  Eye
} from "lucide-react";
import { api } from "@/lib/api";

const loadEngine = () =>
  new Promise<void>((ok, bad) => {
    if ((window as any).faceapi) return ok();
    const s = document.createElement("script");
    s.src = "/vendor/face-api.js";
    s.onload = () => ok();
    s.onerror = () => bad(new Error("Biometric AI engine failed to load"));
    document.body.appendChild(s);
  });

const ear = (p: any[], o: number) =>
  (Math.hypot(p[o + 1].x - p[o + 5].x, p[o + 1].y - p[o + 5].y) +
    Math.hypot(p[o + 2].x - p[o + 4].x, p[o + 2].y - p[o + 4].y)) /
  (2 * Math.hypot(p[o].x - p[o + 3].x, p[o].y - p[o + 3].y));

// Soft audio feedback chime helper
function playChime(freq = 600, duration = 0.12) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore autoplay restriction warnings
  }
}

/**
 * Smartphone-grade Guided 3D Face Enrollment & Verification Viewport
 * Faithful to iOS Face ID & Android Biometric Enrollment
 * Steps: 1. Center / Look Straight -> 2. Turn Head Left -> 3. Turn Head Right -> Auto Save
 */
export function FaceCapture({
  onResult,
  onCancel,
  mode = "ENROLL",
}: {
  onResult: (r: { descriptor: number[]; challengeId: string }) => void;
  onCancel: () => void;
  mode?: "ENROLL" | "VERIFY";
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [err, setErr] = useState("");
  
  // Guided Step States
  const [centerDone, setCenterDone] = useState(false);
  const [leftDone, setLeftDone] = useState(false);
  const [rightDone, setRightDone] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [instruction, setInstruction] = useState("Initializing 3D Face Scanner...");
  const [distanceStatus, setDistanceStatus] = useState<"CLOSE" | "FAR" | "GOOD">("GOOD");
  const [faceInsideFrame, setFaceInsideFrame] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [challengeId, setChallengeId] = useState("");

  // Refs for tracking animation loops without stale closures
  const stateRef = useRef({
    centerDone: false,
    leftDone: false,
    rightDone: false,
    autoSaving: false,
    steadyCount: 0,
    challengeId: "",
  });

  // Manual fallback quick save handler
  const triggerQuickSave = useCallback(async () => {
    if (stateRef.current.autoSaving || !video.current) return;
    const f = (window as any).faceapi;
    if (!f) return;
    stateRef.current.autoSaving = true;
    setAutoSaving(true);
    setInstruction("✓ Saving biometric embeddings to vault...");
    playChime(880, 0.2);

    try {
      const opts = new f.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 });
      const full = await f.detectSingleFace(video.current, opts).withFaceLandmarks().withFaceDescriptor();
      if (full) {
        setProgress(100);
        setTimeout(() => {
          onResult({
            descriptor: Array.from(full.descriptor),
            challengeId: stateRef.current.challengeId,
          });
        }, 500);
      } else {
        stateRef.current.autoSaving = false;
        setAutoSaving(false);
        setInstruction("Please keep face still and try again");
      }
    } catch (e: any) {
      stateRef.current.autoSaving = false;
      setAutoSaving(false);
      setErr(e.message || "Failed to process face descriptor");
    }
  }, [onResult]);

  useEffect(() => {
    let stop = false;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        setInstruction("Loading AI neural network models...");
        await loadEngine();
        const f = (window as any).faceapi;
        await Promise.all([
          f.nets.tinyFaceDetector.loadFromUri("/models"),
          f.nets.faceLandmark68Net.loadFromUri("/models"),
          f.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);

        // Fetch single-use server challenge
        let chId = "";
        try {
          const ch = await api<{ challengeId: string; action: "BLINK" | "TURN" }>("/face/challenge");
          chId = ch.challengeId;
          setChallengeId(chId);
          stateRef.current.challengeId = chId;
        } catch {
          // Graceful fallback for offline / mock runs
          chId = "local-bypass-challenge";
          setChallengeId(chId);
          stateRef.current.challengeId = chId;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
        });

        if (stop) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        setLoadingModels(false);
        setInstruction("Look directly at the camera to start");

        const opts = new f.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 });

        const tick = async () => {
          if (stop || stateRef.current.autoSaving) return;

          try {
            const det = await f.detectSingleFace(v, opts).withFaceLandmarks();

            if (!det) {
              setFaceInsideFrame(false);
              setInstruction("Position your face inside the circle");
              setTimeout(tick, 140);
              return;
            }

            setFaceInsideFrame(true);

            // Responsive face distance calculation
            const boxW = det.detection.box.width;
            if (boxW < 75) {
              setDistanceStatus("FAR");
              setInstruction("Move slightly closer to the camera 🔍");
              setTimeout(tick, 140);
              return;
            } else if (boxW > 280) {
              setDistanceStatus("CLOSE");
              setInstruction("Move back slightly ↔");
              setTimeout(tick, 140);
              return;
            } else {
              setDistanceStatus("GOOD");
            }

            const p = det.landmarks.positions;
            const jaw = det.landmarks.getJawOutline();
            const nose = det.landmarks.getNose()[3] || p[30];

            // Yaw ratio: horizontal balance of nose tip relative to jaw edges
            const leftJawDist = Math.abs(nose.x - jaw[0].x);
            const totalJawWidth = Math.abs(jaw[16].x - jaw[0].x);
            const yaw = leftJawDist / (totalJawWidth || 1);

            // Step 1: Center / Frontal Alignment (yaw between 0.42 and 0.58)
            if (!stateRef.current.centerDone) {
              if (yaw >= 0.42 && yaw <= 0.58) {
                stateRef.current.steadyCount++;
                if (stateRef.current.steadyCount >= 2) {
                  stateRef.current.centerDone = true;
                  setCenterDone(true);
                  setProgress(34);
                  playChime(520, 0.1);
                  setInstruction("✓ Center captured! Now turn head slowly to the LEFT ↺");
                } else {
                  setInstruction("Hold still... Scanning center angle");
                }
              } else {
                stateRef.current.steadyCount = 0;
                setInstruction("Look straight ahead at the camera lens");
              }
              setTimeout(tick, 140);
              return;
            }

            // Step 2: Left Pose (yaw < 0.38 when turned towards left)
            if (!stateRef.current.leftDone) {
              // Due to mirrored feed, yaw < 0.38 is left or yaw > 0.62 is right
              if (yaw < 0.38) {
                stateRef.current.leftDone = true;
                setLeftDone(true);
                setProgress(67);
                playChime(660, 0.1);
                setInstruction("✓ Left profile captured! Now turn head slowly to the RIGHT ↻");
              } else {
                setInstruction("Slowly turn your head to the LEFT ↺");
              }
              setTimeout(tick, 140);
              return;
            }

            // Step 3: Right Pose (yaw > 0.62 when turned towards right)
            if (!stateRef.current.rightDone) {
              if (yaw > 0.62) {
                stateRef.current.rightDone = true;
                setRightDone(true);
                setProgress(100);
                playChime(880, 0.2);
                setInstruction("✓ 3D Face Scan Complete! Auto-saving biometrics...");
                
                // AUTO-SAVE: Automatically extract 128D descriptor and submit
                stateRef.current.autoSaving = true;
                setAutoSaving(true);

                // Wait 450ms for user to see the 100% green checkmark animation
                setTimeout(async () => {
                  try {
                    const full = await f.detectSingleFace(v, opts).withFaceLandmarks().withFaceDescriptor();
                    if (full) {
                      stop = true;
                      stream?.getTracks().forEach((t) => t.stop());
                      playChime(1046, 0.25);
                      onResult({
                        descriptor: Array.from(full.descriptor),
                        challengeId: stateRef.current.challengeId,
                      });
                    } else {
                      // Fallback quick attempt
                      stateRef.current.autoSaving = false;
                      setAutoSaving(false);
                      setInstruction("Hold still facing camera to finalize auto-save");
                    }
                  } catch (err: any) {
                    setErr(err.message || "Failed to finalize face descriptor");
                    stateRef.current.autoSaving = false;
                    setAutoSaving(false);
                  }
                }, 450);
                return;
              } else {
                setInstruction("Now slowly turn your head to the RIGHT ↻");
              }
              setTimeout(tick, 140);
              return;
            }

          } catch (e: any) {
            // Ignore temporary detection frame dropouts
          }

          setTimeout(tick, 140);
        };

        tick();
      } catch (e: any) {
        setErr(e.message || "Webcam camera access was denied or unavailable.");
      }
    })();

    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  // Radius for 270px ring
  const circleRadius = 126;
  const circumference = 2 * Math.PI * circleRadius; // ~791.68
  const strokeDashoffset = circumference - (circumference * progress) / 100;

  return (
    <div className="flex flex-col items-center space-y-4 text-center select-none py-2">
      {/* Smartphone-Style Circular Viewport with Animated SVG Progress Ring */}
      <div className="relative flex items-center justify-center">
        {/* SVG Circular Progress Ring */}
        <svg
          className="w-72 h-72 -rotate-90 pointer-events-none drop-shadow-md"
          viewBox="0 0 280 280"
        >
          {/* Background Track Circle */}
          <circle
            cx="140"
            cy="140"
            r={circleRadius}
            fill="transparent"
            stroke="#E5E7EB"
            strokeWidth="8"
          />

          {/* Dynamic Progress Fill Circle */}
          <circle
            cx="140"
            cy="140"
            r={circleRadius}
            fill="transparent"
            stroke={progress === 100 ? "#10B981" : progress > 0 ? "#3B82F6" : "#CBD5E1"}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Video Viewport Container (Perfect Circular Mask) */}
        <div className="absolute h-60 w-60 rounded-full overflow-hidden bg-neutral-950 border-2 border-white shadow-inner flex items-center justify-center">
          <video
            ref={video}
            muted
            playsInline
            className="h-full w-full object-cover -scale-x-100"
          />

          {/* Real-time laser scanning reticle (active during scan) */}
          {!autoSaving && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34D399] animate-bounce pointer-events-none" />
          )}

          {/* Biometric Face Silhouette Guide Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`w-36 h-48 rounded-[50%] border-2 border-dashed transition-colors duration-300 ${
                autoSaving || progress === 100
                  ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_#10B981]"
                  : faceInsideFrame
                  ? "border-emerald-400/80 shadow-[0_0_10px_#34D399]"
                  : "border-white/50"
              }`}
            />
          </div>

          {/* Dynamic Direction Arrows / Live Pointers on Video */}
          {!autoSaving && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
              <div className="pt-2">
                {distanceStatus === "FAR" && (
                  <span className="rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
                    Move Closer
                  </span>
                )}
                {distanceStatus === "CLOSE" && (
                  <span className="rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
                    Step Back
                  </span>
                )}
              </div>

              {/* Turn Direction Cue */}
              <div className="pb-3">
                {centerDone && !leftDone && (
                  <div className="flex items-center gap-1.5 rounded-full bg-blue-600/90 px-3 py-1 text-xs font-black text-white animate-pulse shadow-lg">
                    <ArrowLeft className="h-4 w-4" /> Turn Head Left
                  </div>
                )}
                {centerDone && leftDone && !rightDone && (
                  <div className="flex items-center gap-1.5 rounded-full bg-blue-600/90 px-3 py-1 text-xs font-black text-white animate-pulse shadow-lg">
                    Turn Head Right <ArrowRight className="h-4 w-4" />
                  </div>
                )}
                {!centerDone && faceInsideFrame && (
                  <div className="flex items-center gap-1.5 rounded-full bg-neutral-900/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    <Eye className="h-3 w-3" /> Look Straight
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 100% Completion Celebration Overlay */}
          {autoSaving && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white animate-in fade-in zoom-in-95 duration-300">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl animate-bounce">
                <Check className="h-10 w-10 stroke-[3]" />
              </div>
              <p className="mt-3 text-xs font-black tracking-wide text-white uppercase">
                Face Scanned 100%
              </p>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                Auto-saving to vault...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Guidance Banner */}
      <div className="w-full max-w-sm px-2">
        <div
          className={`rounded-2xl p-3 text-xs font-bold transition-all border ${
            autoSaving
              ? "bg-emerald-50 text-emerald-900 border-emerald-300"
              : err
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-neutral-100 text-neutral-800 border-neutral-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {autoSaving ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : err ? (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            ) : (
              <ScanFace className="h-4 w-4 text-brand-red shrink-0" />
            )}
            <span>{err || instruction}</span>
          </div>
        </div>
      </div>

      {/* 3 Step Badges (Like smartphone Face ID: Center -> Left -> Right) */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* Step 1: Center */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition border ${
            centerDone
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : "bg-white text-neutral-700 border-neutral-300 shadow-xs"
          }`}
        >
          {centerDone ? (
            <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
          )}
          <span>1. Look Center</span>
        </div>

        {/* Step 2: Turn Left */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition border ${
            leftDone
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : centerDone
              ? "bg-blue-50 text-blue-800 border-blue-300 animate-pulse shadow-xs"
              : "bg-white text-neutral-400 border-neutral-200 opacity-60"
          }`}
        >
          {leftDone ? (
            <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
          ) : (
            <ArrowLeft className="h-3.5 w-3.5" />
          )}
          <span>2. Turn Left</span>
        </div>

        {/* Step 3: Turn Right */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition border ${
            rightDone
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : centerDone && leftDone
              ? "bg-blue-50 text-blue-800 border-blue-300 animate-pulse shadow-xs"
              : "bg-white text-neutral-400 border-neutral-200 opacity-60"
          }`}
        >
          {rightDone ? (
            <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
          <span>3. Turn Right</span>
        </div>
      </div>

      {/* Progress & Quick Manual Save Action Bar */}
      <div className="flex flex-col items-center gap-2 pt-1">
        {/* 1-Click Quick Save Button (Allows skipping head turns anytime face is detected) */}
        {!autoSaving && faceInsideFrame && (
          <button
            type="button"
            onClick={triggerQuickSave}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 hover:bg-black px-4 py-2 text-xs font-bold text-white shadow-md transition hover:scale-105 active:scale-95"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Quick Auto-Save (Skip Head Turns)</span>
          </button>
        )}

        {/* Cancel Action */}
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 hover:underline pt-1"
        >
          Cancel Registration
        </button>
      </div>
    </div>
  );
}

/** Legacy / Snapshot Selfie capture component */
export function SelfieCapture({
  onResult,
  onCancel,
}: {
  onResult: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let s: MediaStream;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((m) => {
        s = m;
        video.current!.srcObject = m;
        video.current!.play();
      })
      .catch(() => setErr("Camera unavailable"));
    return () => s?.getTracks().forEach((t) => t.stop());
  }, []);

  const snap = () => {
    const v = video.current!;
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = Math.round((320 * v.videoHeight) / v.videoWidth);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    onResult(c.toDataURL("image/jpeg", 0.7));
  };

  return (
    <div className="space-y-3 text-center">
      <video
        ref={video}
        muted
        playsInline
        className="mx-auto w-full max-w-xs -scale-x-100 rounded-2xl bg-black"
      />
      {err && <p className="text-brand-red text-xs font-bold">{err}</p>}
      <button
        className="rounded-lg bg-brand-red px-5 py-2 font-semibold text-white text-xs shadow-md"
        onClick={snap}
      >
        Capture Snapshot
      </button>
      <div>
        <button className="text-xs text-brand-muted hover:underline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
