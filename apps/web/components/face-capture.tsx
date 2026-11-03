"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
const loadEngine = () => new Promise<void>((ok, bad) => { if ((window as any).faceapi) return ok(); const s = document.createElement("script"); s.src = "/vendor/face-api.js"; s.onload = () => ok(); s.onerror = () => bad(new Error("Face engine failed to load")); document.body.appendChild(s); });
const ear = (p: any[], o: number) => (Math.hypot(p[o + 1].x - p[o + 5].x, p[o + 1].y - p[o + 5].y) + Math.hypot(p[o + 2].x - p[o + 4].x, p[o + 2].y - p[o + 4].y)) / (2 * Math.hypot(p[o].x - p[o + 3].x, p[o].y - p[o + 3].y));

/** In-browser face descriptor + liveness challenge (blink / head turn). Server issues a single-use challenge. */
export function FaceCapture({ onResult, onCancel }: { onResult: (r: { descriptor: number[]; challengeId: string }) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null); const [hint, setHint] = useState("Loading face engine…"); const [err, setErr] = useState("");
  useEffect(() => {
    let stop = false, stream: MediaStream | null = null;
    (async () => {
      try {
        await loadEngine(); const f = (window as any).faceapi;
        await Promise.all([f.nets.tinyFaceDetector.loadFromUri("/models"), f.nets.faceLandmark68Net.loadFromUri("/models"), f.nets.faceRecognitionNet.loadFromUri("/models")]);
        const ch = await api<{ challengeId: string; action: "BLINK" | "TURN" }>("/face/challenge");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480 } });
        if (stop) return stream.getTracks().forEach(t => t.stop());
        const v = video.current!; v.srcObject = stream; await v.play();
        const opts = new f.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        let open = false, centered = false, passed = false;
        setHint(ch.action === "BLINK" ? "Look at the camera and blink once" : "Look at the camera, then turn your head to one side");
        const tick = async () => {
          if (stop) return;
          const det = await f.detectSingleFace(v, opts).withFaceLandmarks();
          if (!det) setHint("No face detected");
          else if (det.detection.box.width < 110) setHint("Move closer to the camera");
          else {
            const p = det.landmarks.positions, e = (ear(p, 36) + ear(p, 42)) / 2, jaw = det.landmarks.getJawOutline(), nose = det.landmarks.getNose()[3];
            const r = (nose.x - jaw[0].x) / (jaw[16].x - jaw[0].x), frontal = r > 0.42 && r < 0.58 && e > 0.25;
            if (!passed) {
              if (ch.action === "BLINK") { if (e > 0.27) open = true; if (open && e < 0.2) passed = true; }
              else { if (r > 0.4 && r < 0.6) centered = true; if (centered && (r < 0.33 || r > 0.67)) passed = true; }
              if (passed) setHint("Great — now look straight at the camera");
            } else if (frontal) {
              const full = await f.detectSingleFace(v, opts).withFaceLandmarks().withFaceDescriptor();
              if (full) { stop = true; stream?.getTracks().forEach(t => t.stop()); return onResult({ descriptor: Array.from(full.descriptor), challengeId: ch.challengeId }); }
            }
          }
          setTimeout(tick, 150);
        };
        tick();
      } catch (e: any) { setErr(e.message || "Camera unavailable"); }
    })();
    return () => { stop = true; stream?.getTracks().forEach(t => t.stop()); };
  }, []); // eslint-disable-line
  return (<div className="space-y-3 text-center"><video ref={video} muted playsInline className="mx-auto aspect-square w-full max-w-xs -scale-x-100 rounded-2xl bg-black object-cover" />
    <p className={`text-sm font-semibold ${err ? "text-brand-red" : ""}`}>{err || hint}</p><button className="text-sm text-brand-muted" onClick={onCancel}>Cancel</button></div>);
}

export function SelfieCapture({ onResult, onCancel }: { onResult: (dataUrl: string) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null); const [err, setErr] = useState("");
  useEffect(() => { let s: MediaStream; navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }).then(m => { s = m; video.current!.srcObject = m; video.current!.play(); }).catch(() => setErr("Camera unavailable"));
    return () => s?.getTracks().forEach(t => t.stop()); }, []);
  const snap = () => { const v = video.current!, c = document.createElement("canvas"); c.width = 320; c.height = Math.round(320 * v.videoHeight / v.videoWidth); c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height); onResult(c.toDataURL("image/jpeg", 0.7)); };
  return (<div className="space-y-3 text-center"><video ref={video} muted playsInline className="mx-auto w-full max-w-xs -scale-x-100 rounded-2xl bg-black" />{err && <p className="text-brand-red">{err}</p>}
    <button className="rounded-lg bg-brand-red px-5 py-2 font-semibold text-white" onClick={snap}>Capture</button><div><button className="text-sm text-brand-muted" onClick={onCancel}>Cancel</button></div></div>);
}
