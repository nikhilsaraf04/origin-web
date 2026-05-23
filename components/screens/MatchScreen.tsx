// Match-mode result screen. Shown after a "Check match" scan or a URL match.
// Reads the pending ScanResult from sessionStorage so a hard refresh stays
// stable across hydration. "Save anyway" re-routes to /review.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCoffeeStore } from "@/lib/store/coffee-store";
import { CoffeeBagPhoto } from "@/components/CoffeeBagPhoto";
import { OChip } from "@/components/OChip";
import { OLabel } from "@/components/OLabel";
import { OMatchBadge } from "@/components/OMatchBadge";
import { computeMatchScore } from "@/lib/services/match-score";
import {
  TasteProfileMinLogs,
  computeTasteProfile,
  isProfileReady,
} from "@/lib/types/taste-profile";
import type { ScanResult } from "@/lib/types/models";
import { stringHashIndex } from "@/lib/design-tokens";

const SCAN_KEY = "origin-web:scan-result";

export function MatchScreen() {
  const router = useRouter();
  const logs = useCoffeeStore((s) => s.logs);
  const hydrated = useCoffeeStore((s) => s.hydrated);
  const pendingFromStore = useCoffeeStore((s) => s.pendingScan);
  const setPendingScan = useCoffeeStore((s) => s.setPendingScan);

  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Hydrate scan from sessionStorage (preferred — survives refresh) or store.
  // Run once on mount; subsequent store updates flow through pendingFromStore
  // but we don't want to clobber local state from there.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SCAN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ScanResult;
        setScan(parsed);
        setPendingScan(parsed);
      } else if (pendingFromStore) {
        setScan(pendingFromStore);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
    // Intentionally mount-only — don't re-hydrate on store changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profile = useMemo(
    () =>
      logs.length >= TasteProfileMinLogs ? computeTasteProfile(logs) : null,
    [logs],
  );

  const match = useMemo(() => {
    if (!scan || !isProfileReady(profile)) return null;
    // Reuse precomputed score if the scan already carries one (parity with iOS),
    // otherwise compute it now from the live profile.
    if (typeof scan.matchScore === "number" && scan.matchScore > 0) {
      return {
        score: scan.matchScore,
        reason: scan.matchReason ?? "",
      };
    }
    return computeMatchScore(scan, profile);
  }, [scan, profile]);

  // Empty / loading states.
  if (!loaded || !hydrated) {
    return (
      <main className="min-h-screen bg-bg-0">
        <Header onClose={() => router.push("/")} />
        <div className="max-w-3xl mx-auto px-s5 py-s8 text-ink-3 font-ui text-[12px]">
          Loading…
        </div>
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="min-h-screen bg-bg-0">
        <Header onClose={() => router.push("/")} />
        <div className="max-w-3xl mx-auto px-s5 py-s9 flex flex-col items-center gap-s4 text-center">
          <p className="font-display text-[22px] text-ink-1">No scan to match</p>
          <p className="font-ui text-[12px] text-ink-3 max-w-sm">
            Head back to Scan, pick &ldquo;Check match&rdquo;, then upload a bag
            photo or paste a roastery URL.
          </p>
          <button
            type="button"
            onClick={() => router.push("/scan")}
            className="mt-s3 bg-accent text-accent-ink font-ui font-medium text-[12px] uppercase rounded-r2 px-s5 py-s3"
            style={{ letterSpacing: "0.1em" }}
          >
            Go to scan
          </button>
        </div>
      </main>
    );
  }

  const colorIndex = stringHashIndex(scan.roaster || "");
  const profileReady = isProfileReady(profile);
  const logsRemaining = Math.max(0, TasteProfileMinLogs - logs.length);

  function saveAnyway() {
    if (!scan) return;
    try {
      sessionStorage.setItem(SCAN_KEY, JSON.stringify(scan));
    } catch {
      /* ignore */
    }
    router.push("/review");
  }

  function done() {
    try {
      sessionStorage.removeItem(SCAN_KEY);
    } catch {
      /* ignore */
    }
    setPendingScan(null);
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-bg-0 pb-[120px]">
      <div className="max-w-3xl mx-auto">
        <Header onClose={done} />

        {/* Summary card */}
        <section className="px-s5 pt-s4 pb-s5 flex items-start gap-s4">
          <CoffeeBagPhoto
            width={70}
            height={94}
            colorIndex={colorIndex}
            country={scan.originCountry || null}
            roaster={scan.roaster || null}
            photoDataUrl={scan.bagPhotoDataUrl}
          />
          <div className="flex-1 flex flex-col gap-s2 min-w-0">
            <span
              className="font-ui text-[10px] uppercase text-ink-4"
              style={{ letterSpacing: "0.16em" }}
            >
              {scan.roaster || "Unknown Roaster"}
            </span>
            <h1 className="font-display font-bold text-[22px] text-ink-1 leading-tight line-clamp-2">
              {scan.coffeeName || "Untitled Coffee"}
            </h1>
            <p className="font-ui text-[12px] text-ink-3 truncate">
              {[scan.originCountry, scan.originRegion, scan.process]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </section>

        <div className="h-[0.5px] bg-line-1" />

        {/* Match badge */}
        <section className="px-s5 py-s6">
          {profileReady ? (
            <OMatchBadge
              pct={match ? match.score : null}
              reason={match?.reason ?? ""}
            />
          ) : (
            <div className="flex flex-col gap-s3">
              <OMatchBadge pct={null} reason="" />
              <div className="rounded-r4 border border-line-2 bg-bg-1 px-s4 py-s4 flex flex-col gap-s2">
                <OLabel text="Locked" variant="accent" />
                <p className="font-ui text-[12px] text-ink-2 leading-relaxed">
                  Log {logsRemaining === 0 ? "more" : logsRemaining} coffee
                  {logsRemaining === 1 ? "" : "s"} to unlock match scoring.
                </p>
                <p className="font-ui text-[10px] text-ink-4">
                  Match scoring needs at least {TasteProfileMinLogs} rated logs
                  to learn your palate.
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="h-[0.5px] bg-line-1" />

        {/* Attributes */}
        <section className="px-s5 py-s5 flex flex-col gap-s4">
          <OLabel text="Bag Attributes" />
          <div className="flex flex-wrap gap-s2">
            {scan.process ? <OChip text={scan.process} /> : null}
            {scan.roastLevel ? <OChip text={scan.roastLevel} /> : null}
            {scan.originCountry ? <OChip text={scan.originCountry} /> : null}
            {scan.variety ? <OChip text={scan.variety} /> : null}
            {scan.altitudeMASL ? (
              <OChip text={`${scan.altitudeMASL} masl`} />
            ) : null}
          </div>
        </section>

        {scan.roasterFlavorTags.length > 0 ? (
          <>
            <div className="h-[0.5px] bg-line-1" />
            <section className="px-s5 py-s5 flex flex-col gap-s3">
              <OLabel text="Flavor Notes" />
              <div className="flex flex-wrap gap-s2">
                {scan.roasterFlavorTags.map((tag) => (
                  <OChip key={tag} text={tag} highlighted />
                ))}
              </div>
            </section>
          </>
        ) : null}

        {profileReady && match?.reason ? (
          <>
            <div className="h-[0.5px] bg-line-1" />
            <section className="px-s5 py-s5 flex flex-col gap-s3">
              <OLabel text="Why this match" />
              <p className="font-ui text-[13px] text-ink-1 leading-relaxed">
                {match.reason}
              </p>
            </section>
          </>
        ) : null}
      </div>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 bg-bg-0 border-t border-line-2 z-40">
        <div className="max-w-3xl mx-auto px-s5 py-s4 flex gap-s3">
          <button
            type="button"
            onClick={saveAnyway}
            className="flex-1 bg-bg-2 text-ink-1 font-ui font-medium text-[12px] uppercase rounded-r2 py-[14px] border border-line-2"
            style={{ letterSpacing: "0.1em" }}
          >
            Save anyway
          </button>
          <button
            type="button"
            onClick={done}
            className="flex-1 bg-accent text-accent-ink font-ui font-medium text-[12px] uppercase rounded-r2 py-[14px]"
            style={{ letterSpacing: "0.1em" }}
          >
            Done
          </button>
        </div>
      </div>
    </main>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <header className="pt-[56px] pb-s4 px-s5 flex items-center justify-between">
      <div className="flex flex-col gap-[2px]">
        <h2 className="font-display text-[22px] text-ink-1 leading-none">
          Match
        </h2>
        <span
          className="font-ui text-[10px] uppercase text-ink-4"
          style={{ letterSpacing: "0.1em" }}
        >
          Would you like this coffee?
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-8 h-8 rounded-r2 bg-bg-2 text-ink-2 flex items-center justify-center"
        aria-label="Close"
      >
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </header>
  );
}
