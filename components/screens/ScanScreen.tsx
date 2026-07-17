// Mirrors Origin/Screens/ScanScreen.swift — now with a live camera viewfinder
// (getUserMedia) so the web/PWA scans a bag the same way the native app does:
// point → shutter → Claude reads the label. Upload + drag-drop + URL remain as
// fallbacks (desktop, no-camera, or pre-purchase URL scans).
//
// v0.2.0: mode toggle ("Add to library" vs "Check match") + URL pane.
// v0.6.0: live rear-camera capture, scan frame, shutter, torch (where supported).
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCoffeeStore } from "@/lib/store/coffee-store";
import { computeMatchScore } from "@/lib/services/match-score";
import {
  TasteProfileMinLogs,
  computeTasteProfile,
} from "@/lib/types/taste-profile";
import type { ScanResult } from "@/lib/types/models";

type ScanState =
  | { kind: "idle" }
  | { kind: "scanning"; source: "photo" | "url" }
  | { kind: "complete"; result: ScanResult; preview: string }
  | { kind: "error"; message: string };

type Mode = "add" | "match";

// Camera lifecycle. `unavailable` = no device / insecure context / not supported;
// `denied` = user (or OS) refused permission.
type CameraStatus = "idle" | "starting" | "ready" | "denied" | "unavailable";

const MOCK_RESULT: ScanResult = {
  roaster: "Fuglen Coffee Roasters",
  coffeeName: "Panama Gesha Washed",
  originCountry: "Panama",
  originRegion: "Boquete",
  farmEstate: "",
  altitudeMASL: "",
  roastDateStr: "",
  variety: "Gesha",
  process: "Washed",
  roastLevel: "Light",
  roasterFlavorTags: ["jasmine", "bergamot", "honey"],
  certifications: [],
  confidence: {
    roaster: 0.92,
    coffee: 0.88,
    country: 0.95,
    process: 0.9,
    roast: 0.85,
  },
};

export function ScanScreen() {
  const router = useRouter();
  const setPendingScan = useCoffeeStore((s) => s.setPendingScan);
  const [mode, setMode] = useState<Mode>("add");
  const [state, setState] = useState<ScanState>({ kind: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const logs = useCoffeeStore((s) => s.logs);
  const profile = useMemo(
    () => (logs.length >= TasteProfileMinLogs ? computeTasteProfile(logs) : null),
    [logs],
  );

  const routeFor = useCallback(
    (source: "photo" | "url"): "/match" | "/review" =>
      source === "url" || mode === "match" ? "/match" : "/review",
    [mode],
  );

  function attachMatchScore(result: ScanResult): ScanResult {
    if (!profile) return result;
    const { score, reason } = computeMatchScore(result, profile);
    if (score > 0) {
      return { ...result, matchScore: score, matchReason: reason };
    }
    return result;
  }

  // ---- Camera control -----------------------------------------------------

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (startingRef.current || streamRef.current) return;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      (typeof window !== "undefined" && !window.isSecureContext)
    ) {
      setCameraStatus("unavailable");
      return;
    }
    startingRef.current = true;
    setCameraStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // iOS Safari needs an explicit play() after srcObject is set.
        try {
          await video.play();
        } catch {
          /* autoplay policies — the muted+playsInline attrs cover this */
        }
      }
      // Torch support is rare on iOS but common on Android Chrome.
      const track = stream.getVideoTracks()[0];
      const caps =
        (track?.getCapabilities?.() as MediaTrackCapabilities & {
          torch?: boolean;
        }) || {};
      setTorchSupported(Boolean(caps.torch));
      setCameraStatus("ready");
    } catch (err) {
      const name = (err as DOMException)?.name;
      setCameraStatus(
        name === "NotAllowedError" || name === "SecurityError"
          ? "denied"
          : "unavailable",
      );
    } finally {
      startingRef.current = false;
    }
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet & { torch: boolean }],
      });
      setTorchOn(next);
    } catch {
      /* torch not actually applicable */
    }
  }, [torchOn]);

  // Start the camera on mount; stop it on unmount.
  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ---- Scan actions -------------------------------------------------------

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setState({ kind: "error", message: "Please upload an image file." });
        return;
      }
      const dataUrl = await readFileAsDataURL(file);
      setPreview(dataUrl);
      stopCamera(); // freeze on the captured/uploaded frame while Claude reads it
      setState({ kind: "scanning", source: "photo" });

      try {
        const fd = new FormData();
        fd.append("image", file);
        const resp = await fetch("/api/scan", { method: "POST", body: fd });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `Scan failed (${resp.status})`);
        }
        const json = (await resp.json()) as ScanResult;
        const result: ScanResult = attachMatchScore({
          ...json,
          bagPhotoDataUrl: dataUrl,
        });
        setState({ kind: "complete", result, preview: dataUrl });
      } catch (err) {
        setState({
          kind: "error",
          message: (err as Error).message || "Could not read the bag.",
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, stopCamera],
  );

  // Capture the current video frame and run it through the same scan path.
  const captureAndScan = useCallback(() => {
    const video = videoRef.current;
    if (!video || cameraStatus !== "ready") return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setState({ kind: "error", message: "Capture failed. Try again." });
          return;
        }
        const file = new File([blob], "bag-scan.jpg", { type: "image/jpeg" });
        void handleFile(file);
      },
      "image/jpeg",
      0.92,
    );
  }, [cameraStatus, handleFile]);

  const handleUrl = useCallback(
    async (rawUrl: string) => {
      const url = rawUrl.trim();
      if (!url) {
        setState({ kind: "error", message: "Paste a URL first." });
        return;
      }
      setPreview(null);
      setState({ kind: "scanning", source: "url" });
      try {
        const resp = await fetch("/api/match-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!resp.ok) {
          let msg = `Scan failed (${resp.status})`;
          try {
            const j = (await resp.json()) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        const json = (await resp.json()) as ScanResult;
        const result = attachMatchScore(json);
        setState({ kind: "complete", result, preview: "" });
        stashAndGo(result, "/match");
      } catch (err) {
        setState({
          kind: "error",
          message: (err as Error).message || "Could not read that URL.",
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile],
  );

  function simulate() {
    setState({ kind: "scanning", source: "photo" });
    window.setTimeout(() => {
      const result = attachMatchScore(MOCK_RESULT);
      setState({ kind: "complete", result, preview: "" });
    }, 1000);
  }

  function reset() {
    setPreview(null);
    setUrlValue("");
    setState({ kind: "idle" });
    void startCamera(); // resume the viewfinder for another attempt
  }

  function stashAndGo(result: ScanResult, route: "/match" | "/review") {
    try {
      sessionStorage.setItem("origin-web:scan-result", JSON.stringify(result));
      setPendingScan(result);
      router.push(route);
    } catch (err) {
      setState({
        kind: "error",
        message: `Could not stash scan: ${(err as Error).message}`,
      });
    }
  }

  function proceedFromComplete() {
    if (state.kind !== "complete") return;
    stashAndGo(state.result, routeFor("photo"));
  }

  // Drag-and-drop anywhere on the window.
  useEffect(() => {
    function onDragOver(e: DragEvent) {
      e.preventDefault();
      setDragOver(true);
    }
    function onDragLeave(e: DragEvent) {
      if ((e as DragEvent).relatedTarget === null) setDragOver(false);
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) void handleFile(file);
    }
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleFile]);

  const ctaLabel = mode === "match" ? "See match →" : "Review scan →";
  const cameraLive = cameraStatus === "ready" && !preview;
  const idleHint =
    cameraStatus === "denied"
      ? "Camera access denied"
      : cameraStatus === "unavailable"
        ? "Camera unavailable — upload or paste a URL"
        : cameraStatus === "starting"
          ? "Starting camera…"
          : mode === "match"
            ? "Point at a bag to check your match"
            : "Point camera at bag";

  return (
    <main className="min-h-screen relative bg-bg-0 overflow-hidden">
      {/* Background layers: live video → frozen preview → dark canvas */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
          cameraLive ? "opacity-90" : "opacity-0"
        }`}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Coffee bag preview"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
      ) : null}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 90%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-s5 pt-[60px]">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-9 h-9 rounded-pill bg-white/10 text-white flex items-center justify-center"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
          <span
            className="font-ui font-medium text-[11px] uppercase text-white"
            style={{ letterSpacing: "0.1em" }}
          >
            {mode === "match" ? "Match Scan" : "Scan Bag"}
          </span>
          {torchSupported ? (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              className={`w-9 h-9 rounded-pill flex items-center justify-center ${
                torchOn ? "bg-accent text-accent-ink" : "bg-white/10 text-white"
              }`}
              aria-label={torchOn ? "Turn flash off" : "Turn flash on"}
              aria-pressed={torchOn}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2 5 12h5l-1 6 7-10h-5l1-6Z" /></svg>
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
        </header>

        {/* Mode toggle */}
        <div className="px-s5 pt-s4">
          <div
            className="inline-flex p-[3px] rounded-pill bg-black/40 border border-white/10 backdrop-blur"
            role="tablist"
            aria-label="Scan mode"
          >
            <ModeButton label="Add to library" active={mode === "add"} onClick={() => setMode("add")} />
            <ModeButton label="Check match" active={mode === "match"} onClick={() => setMode("match")} />
          </div>
        </div>

        {/* Scan area */}
        <section className="flex-1 flex flex-col items-center justify-center px-s5 gap-s4 py-s6">
          {/* Framed viewfinder / dropzone. When the camera is live it's a scan
              frame; when there's no camera it doubles as the upload target. */}
          <button
            type="button"
            onClick={() => {
              if (!cameraLive) fileInputRef.current?.click();
            }}
            className={`relative w-[78%] aspect-[3/4] max-h-[52vh] rounded-r4 flex flex-col items-center justify-center gap-s3 transition-colors ${
              cameraLive
                ? "cursor-default"
                : dragOver
                  ? "border-2 border-dashed border-accent bg-accent/10"
                  : "border-2 border-dashed border-white/40 bg-black/30"
            }`}
          >
            {cameraLive ? (
              <ScanFrame />
            ) : preview && state.kind !== "idle" ? (
              <span
                className="font-ui text-[12px] uppercase text-white/80 text-center px-s4"
                style={{ letterSpacing: "0.1em" }}
              >
                {state.kind === "scanning" ? "Reading label…" : ""}
              </span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <p
                  className="font-ui text-[12px] uppercase text-white/80 text-center px-s4"
                  style={{ letterSpacing: "0.1em" }}
                >
                  {cameraStatus === "denied"
                    ? "Camera blocked — click to upload a bag photo"
                    : "Click or drag a bag photo here"}
                </p>
              </>
            )}
            {state.kind === "scanning" && cameraLive === false && preview && (
              <span
                className="absolute bottom-3 font-mono text-[11px] text-white/80"
              >
                Reading label…
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />

          {/* URL pane (idle only, keeps the viewfinder uncluttered mid-scan) */}
          {state.kind === "idle" && (
            <div className="w-[78%] max-w-md flex flex-col gap-s2">
              <div
                className="flex items-center gap-s2 text-white/40 text-[10px] uppercase font-ui"
                style={{ letterSpacing: "0.1em" }}
              >
                <div className="flex-1 h-[0.5px] bg-white/15" />
                <span>or paste a URL</span>
                <div className="flex-1 h-[0.5px] bg-white/15" />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleUrl(urlValue);
                }}
                className="flex items-stretch gap-s2"
              >
                <input
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="https://onyxcoffeelab.com/products/…"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/15 rounded-r2 px-s3 py-s2 text-[13px] text-white placeholder:text-white/30 font-ui"
                />
                <button
                  type="submit"
                  disabled={!urlValue.trim()}
                  className="font-ui font-medium text-[10px] uppercase text-accent-ink bg-accent rounded-r2 px-s4 disabled:opacity-40"
                  style={{ letterSpacing: "0.1em" }}
                >
                  Match
                </button>
              </form>
            </div>
          )}

          {state.kind === "complete" && <DetectedFields result={state.result} />}
        </section>

        {/* Bottom panel */}
        <footer
          className="px-s5 py-s6 backdrop-blur"
          style={{ background: "rgba(10, 14, 22, 0.92)" }}
        >
          {state.kind === "idle" && (
            <div className="flex flex-col gap-s4">
              <div className="flex items-center gap-s2">
                <span className="w-[6px] h-[6px] rounded-pill bg-accent animate-pulse" />
                <span
                  className="font-mono text-[10px] uppercase text-ink-2"
                  style={{ letterSpacing: "0.1em" }}
                >
                  {idleHint}
                </span>
              </div>
              <div className="flex items-center justify-between">
                {/* Upload (secondary) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1 text-white/70 w-16"
                  aria-label="Upload a photo"
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></svg>
                  <span className="font-ui text-[9px] uppercase" style={{ letterSpacing: "0.08em" }}>Upload</span>
                </button>

                {/* Shutter (primary) */}
                <button
                  type="button"
                  onClick={captureAndScan}
                  disabled={!cameraLive}
                  className="relative flex items-center justify-center disabled:opacity-35"
                  aria-label="Capture and scan"
                >
                  <span className="block w-16 h-16 rounded-full border-[2.5px] border-white/55" />
                  <span className="absolute w-[54px] h-[54px] rounded-full bg-white" />
                </button>

                {/* Simulate (secondary) */}
                <button
                  type="button"
                  onClick={simulate}
                  className="flex flex-col items-center gap-1 text-accent w-16"
                  aria-label="Simulate a scan"
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /><path d="M12 4 9.5 9.5 4 12l5.5 2.5L12 20l2.5-5.5L20 12l-5.5-2.5Z" /></svg>
                  <span className="font-ui text-[9px] uppercase" style={{ letterSpacing: "0.08em" }}>Simulate</span>
                </button>
              </div>
            </div>
          )}

          {state.kind === "scanning" && (
            <div className="flex flex-col gap-s2">
              <span
                className="font-ui font-medium text-[10px] uppercase text-ink-2"
                style={{ letterSpacing: "0.1em" }}
              >
                Analyzing
              </span>
              <span className="font-ui text-[10px] text-ink-3">
                {state.source === "url"
                  ? "Claude is reading the roastery page…"
                  : "Claude is reading the bag label…"}
              </span>
            </div>
          )}

          {state.kind === "complete" && (
            <button
              type="button"
              onClick={proceedFromComplete}
              className="w-full bg-accent text-accent-ink font-ui font-medium text-[12px] uppercase rounded-r2 py-[14px]"
              style={{ letterSpacing: "0.1em" }}
            >
              {ctaLabel}
            </button>
          )}

          {state.kind === "error" && (
            <div className="flex flex-col gap-s3">
              <p className="font-ui text-[12px] text-red-400">{state.message}</p>
              <button
                type="button"
                onClick={reset}
                className="font-ui font-medium text-[10px] uppercase text-accent self-start"
                style={{ letterSpacing: "0.1em" }}
              >
                Try again
              </button>
            </div>
          )}
        </footer>
      </div>
    </main>
  );
}

// Corner-bracket scan frame — the web analogue of ScanFrame.swift.
function ScanFrame() {
  const corner = "absolute w-7 h-7 border-accent";
  return (
    <div className="absolute inset-4 pointer-events-none">
      <span className={`${corner} top-0 left-0 border-t-2 border-l-2 rounded-tl-sm`} />
      <span className={`${corner} top-0 right-0 border-t-2 border-r-2 rounded-tr-sm`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-sm`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2 rounded-br-sm`} />
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-s4 py-s2 rounded-pill font-ui font-medium text-[10px] uppercase transition-colors ${
        active ? "bg-accent text-accent-ink" : "text-white/70"
      }`}
      style={{ letterSpacing: "0.1em" }}
    >
      {label}
    </button>
  );
}

function DetectedFields({ result }: { result: ScanResult }) {
  const rows: { label: string; value: string; key: string }[] = [
    { label: "ROASTER", value: result.roaster || "—", key: "roaster" },
    { label: "COFFEE", value: result.coffeeName || "—", key: "coffee" },
    { label: "COUNTRY", value: result.originCountry || "—", key: "country" },
    { label: "PROCESS", value: result.process, key: "process" },
    { label: "ROAST", value: result.roastLevel, key: "roast" },
  ];
  return (
    <div className="w-[78%] max-w-md flex flex-col gap-s2 bg-black/35 backdrop-blur rounded-r4 px-s5 py-s4">
      {rows.map((row) => {
        const c = result.confidence[row.key] ?? 0;
        return (
          <div key={row.key} className="flex items-center gap-s3">
            <span
              className="font-ui text-[10px] uppercase text-white/60"
              style={{ letterSpacing: "0.1em", width: 58 }}
            >
              {row.label}
            </span>
            <span className="font-ui text-[13px] text-white flex-1 truncate">
              {row.value}
            </span>
            {c > 0.7 && (
              <span className="text-accent" aria-label="High confidence">
                ✓
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("File read failed"));
    r.readAsDataURL(file);
  });
}
