// Mirrors Origin/Screens/ScanScreen.swift — web v1 uses file upload + drag/drop
// instead of live camera. Live-camera capture is on the v2 roadmap.
//
// v0.2.0: added a top-of-page mode toggle ("Add to library" vs "Check match")
// and a URL input pane alongside file upload (web-only). Match-mode and URL
// scans route to /match instead of /review.
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
  const logs = useCoffeeStore((s) => s.logs);
  const profile = useMemo(
    () => (logs.length >= TasteProfileMinLogs ? computeTasteProfile(logs) : null),
    [logs],
  );

  /** Where this ScanResult should land next — match mode and URL scans always
   *  go to /match (URL is inherently pre-purchase). */
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

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setState({ kind: "error", message: "Please upload an image file." });
        return;
      }
      const dataUrl = await readFileAsDataURL(file);
      setPreview(dataUrl);
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
    [profile],
  );

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
        // URL scans always route to /match — push immediately for snappier UX.
        stashAndGo(result, "/match");
      } catch (err) {
        setState({
          kind: "error",
          message: (err as Error).message || "Could not read that URL.",
        });
      }
    },
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

  const ctaLabel = mode === "match" ? "See match →" : "Review scan →";

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
            Scan Bag
          </span>
          <div className="w-9 h-9" />
        </header>

        {/* Mode toggle */}
        <div className="px-s5 pt-s4">
          <div
            className="inline-flex p-[3px] rounded-pill bg-black/40 border border-white/10 backdrop-blur"
            role="tablist"
            aria-label="Scan mode"
          >
            <ModeButton
              label="Add to library"
              active={mode === "add"}
              onClick={() => setMode("add")}
            />
            <ModeButton
              label="Check match"
              active={mode === "match"}
              onClick={() => setMode("match")}
            />
          </div>
        </div>

        {/* Scan area */}
        <section className="flex-1 flex flex-col items-center justify-center px-s5 gap-s4 py-s6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-[78%] aspect-[3/4] max-h-[52vh] rounded-r4 border-2 border-dashed flex flex-col items-center justify-center gap-s3 transition-colors ${
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
              {state.kind === "scanning" && state.source === "photo"
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

          {/* URL input pane */}
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
                disabled={state.kind === "scanning"}
                className="flex-1 bg-black/40 border border-white/15 rounded-r2 px-s3 py-s2 text-[13px] text-white placeholder:text-white/30 font-ui"
              />
              <button
                type="submit"
                disabled={state.kind === "scanning" || !urlValue.trim()}
                className="font-ui font-medium text-[10px] uppercase text-accent-ink bg-accent rounded-r2 px-s4 disabled:opacity-40"
                style={{ letterSpacing: "0.1em" }}
              >
                {state.kind === "scanning" && state.source === "url"
                  ? "Reading…"
                  : "Match"}
              </button>
            </form>
          </div>

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
                  {mode === "match"
                    ? "Check if this coffee matches your palate"
                    : "Drop, upload, or paste a roastery URL"}
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
