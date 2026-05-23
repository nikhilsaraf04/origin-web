// Mirrors Origin/Screens/ScanScreen.swift — web v1 uses file upload + drag/drop
// instead of live camera. Live-camera capture is on the v2 roadmap.
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
  | { kind: "scanning" }
  | { kind: "complete"; result: ScanResult; preview: string }
  | { kind: "error"; message: string };

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
  const [state, setState] = useState<ScanState>({ kind: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logs = useCoffeeStore((s) => s.logs);
  const profile = useMemo(
    () => (logs.length >= TasteProfileMinLogs ? computeTasteProfile(logs) : null),
    [logs],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setState({ kind: "error", message: "Please upload an image file." });
        return;
      }
      const dataUrl = await readFileAsDataURL(file);
      setPreview(dataUrl);
      setState({ kind: "scanning" });

      try {
        const fd = new FormData();
        fd.append("image", file);
        const resp = await fetch("/api/scan", { method: "POST", body: fd });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `Scan failed (${resp.status})`);
        }
        const json = (await resp.json()) as ScanResult;
        const result: ScanResult = { ...json, bagPhotoDataUrl: dataUrl };
        if (profile) {
          const { score, reason } = computeMatchScore(result, profile);
          if (score > 0) {
            result.matchScore = score;
            result.matchReason = reason;
          }
        }
        setState({ kind: "complete", result, preview: dataUrl });
      } catch (err) {
        setState({
          kind: "error",
          message: (err as Error).message || "Could not read the bag.",
        });
      }
    },
    [profile],
  );

  function simulate() {
    setState({ kind: "scanning" });
    window.setTimeout(() => {
      setState({ kind: "complete", result: MOCK_RESULT, preview: "" });
    }, 1000);
  }

  function reset() {
    setPreview(null);
    setState({ kind: "idle" });
  }

  function proceedToReview() {
    if (state.kind !== "complete") return;
    try {
      sessionStorage.setItem("origin-web:scan-result", JSON.stringify(state.result));
      router.push("/review");
    } catch (err) {
      setState({
        kind: "error",
        message: `Could not stash scan: ${(err as Error).message}`,
      });
    }
  }

  // Drag-and-drop handlers on the window so users can drop anywhere
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

  return (
    <main className="min-h-screen relative bg-bg-0 overflow-hidden">
      {/* Background — uploaded preview, otherwise dark canvas */}
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

      <div className="relative max-w-3xl mx-auto h-screen flex flex-col">
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
            Scan Bag
          </span>
          <div className="w-9 h-9" />
        </header>

        {/* Scan area */}
        <section className="flex-1 flex flex-col items-center justify-center px-s5 gap-s4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-[78%] aspect-[3/4] max-h-[60vh] rounded-r4 border-2 border-dashed flex flex-col items-center justify-center gap-s3 transition-colors ${
              dragOver
                ? "border-accent bg-accent/10"
                : "border-white/40 bg-black/30"
            }`}
          >
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <p
              className="font-ui text-[12px] uppercase text-white/80 text-center px-s4"
              style={{ letterSpacing: "0.1em" }}
            >
              {state.kind === "scanning"
                ? "Reading label…"
                : "Click or drag a bag photo here"}
            </p>
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

          {state.kind === "complete" && (
            <DetectedFields result={state.result} />
          )}
        </section>

        {/* Bottom panel */}
        <footer
          className="px-s5 py-s6 backdrop-blur"
          style={{ background: "rgba(10, 14, 22, 0.92)" }}
        >
          {state.kind === "idle" && (
            <div className="flex items-center justify-between gap-s4">
              <div className="flex items-center gap-s2">
                <span className="w-[6px] h-[6px] rounded-pill bg-accent animate-pulse" />
                <span
                  className="font-mono text-[10px] uppercase text-ink-2"
                  style={{ letterSpacing: "0.1em" }}
                >
                  Drop or upload a bag photo
                </span>
              </div>
              <button
                type="button"
                onClick={simulate}
                className="font-ui font-medium text-[10px] uppercase text-accent border border-[var(--accent-border)] rounded-r2 px-s3 py-s2"
                style={{ letterSpacing: "0.1em" }}
              >
                Simulate
              </button>
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
                Claude is reading the bag label…
              </span>
            </div>
          )}

          {state.kind === "complete" && (
            <button
              type="button"
              onClick={proceedToReview}
              className="w-full bg-accent text-accent-ink font-ui font-medium text-[12px] uppercase rounded-r2 py-[14px]"
              style={{ letterSpacing: "0.1em" }}
            >
              Review scan →
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
