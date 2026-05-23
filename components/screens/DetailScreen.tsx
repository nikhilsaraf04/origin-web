// Mirrors Origin/Screens/DetailScreen.swift
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCoffeeStore } from "@/lib/store/coffee-store";
import { CoffeeBagPhoto } from "@/components/CoffeeBagPhoto";
import { OChip } from "@/components/OChip";
import { OLabel } from "@/components/OLabel";
import { OMatchBadge } from "@/components/OMatchBadge";
import { ORating } from "@/components/ORating";
import { stringHashIndex } from "@/lib/design-tokens";
import type { CoffeeLog } from "@/lib/types/models";

interface RoasterInfo {
  location: string;
  founded: string;
  about: string;
  notable: string;
}

export function DetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const hydrated = useCoffeeStore((s) => s.hydrated);
  const log = useCoffeeStore((s) => s.logs.find((l) => l.id === id));
  const update = useCoffeeStore((s) => s.update);
  const remove = useCoffeeStore((s) => s.remove);

  const [isEditing, setIsEditing] = useState(false);
  const [roasterInfo, setRoasterInfo] = useState<RoasterInfo | null>(null);
  const [loadingRoaster, setLoadingRoaster] = useState(false);

  // Local editable state (when editing); flush to store on Done.
  const [draft, setDraft] = useState<CoffeeLog | undefined>(log);
  useEffect(() => {
    setDraft(log);
  }, [log]);

  useEffect(() => {
    if (!log?.roaster) return;
    let cancelled = false;
    setLoadingRoaster(true);
    fetch(`/api/roaster?name=${encodeURIComponent(log.roaster)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: RoasterInfo | null) => {
        if (!cancelled) {
          setRoasterInfo(data && (data.location || data.about) ? data : null);
        }
      })
      .catch(() => {
        if (!cancelled) setRoasterInfo(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoaster(false);
      });
    return () => {
      cancelled = true;
    };
  }, [log?.roaster]);

  if (!log) {
    return (
      <main className="min-h-screen pt-[80px] px-s5 max-w-3xl mx-auto text-ink-3">
        <p className="font-ui text-[14px]">
          {hydrated ? "No coffee found with that id." : "Loading…"}
        </p>
        {hydrated && (
          <Link
            href="/"
            className="text-accent text-[12px] uppercase tracking-[0.1em]"
          >
            Back to library
          </Link>
        )}
      </main>
    );
  }

  const colorIndex = stringHashIndex(log.roaster);
  const view: CoffeeLog = isEditing && draft ? draft : log;
  const logId = log.id;

  const setField = <K extends keyof CoffeeLog>(key: K, value: CoffeeLog[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const done = () => {
    if (draft) {
      update(logId, draft);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm("Delete this log?")) {
      remove(logId);
      router.push("/");
    }
  };

  return (
    <main className="min-h-screen pb-[120px] bg-bg-0">
      <div className="relative h-[220px] max-w-3xl mx-auto">
        <CoffeeBagPhoto
          width={9999}
          height={220}
          colorIndex={colorIndex}
          country={log.originCountry}
          roaster={log.roaster}
          photoDataUrl={log.bagPhotoDataUrl}
          className="!w-full"
        />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: 88,
            background: "linear-gradient(to bottom, transparent, var(--bg-0))",
          }}
        />
        <button
          type="button"
          onClick={() => router.push("/")}
          className="absolute top-[68px] left-[18px] rounded-pill bg-bg-3/85 w-9 h-9 flex items-center justify-center text-ink-1"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={isEditing ? done : () => setIsEditing(true)}
          className={`absolute top-[68px] right-[18px] rounded-r2 px-s3 py-s2 font-ui font-medium text-[10px] uppercase ${
            isEditing ? "bg-accent text-accent-ink" : "bg-bg-3/85 text-ink-1"
          }`}
          style={{ letterSpacing: "0.1em" }}
        >
          {isEditing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-s5 pt-s4 flex flex-col gap-s6">
        {/* Match badge */}
        <OMatchBadge
          pct={log.matchScore ?? null}
          reason={log.matchReason ?? "Log more coffees to unlock your taste match."}
        />

        <div className="h-[0.5px] bg-line-1" />

        {/* Title */}
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <input
              className="font-display font-bold text-[30px] text-ink-1"
              value={view.coffeeName}
              onChange={(e) => setField("coffeeName", e.target.value)}
            />
            <input
              className="font-ui text-[10px] uppercase text-ink-3"
              style={{ letterSpacing: "0.1em" }}
              value={view.roaster}
              onChange={(e) => setField("roaster", e.target.value)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <h1 className="font-display font-bold text-[30px] text-ink-1 leading-tight">
              {log.coffeeName}
            </h1>
            <div
              className="font-ui text-[10px] uppercase text-ink-3"
              style={{ letterSpacing: "0.1em" }}
            >
              {log.roaster}
            </div>
          </div>
        )}

        <div className="h-[0.5px] bg-line-1" />

        {/* Chips */}
        <div className="flex flex-wrap gap-s2">
          {log.originCountry && <OChip text={log.originCountry} highlighted />}
          {log.originRegion && <OChip text={log.originRegion} highlighted />}
          <OChip text={log.process} highlighted />
          {log.variety && <OChip text={log.variety} />}
          <OChip text={log.roastLevel} />
          {log.altitudeMASL ? <OChip text={`${log.altitudeMASL}m`} /> : null}
          {log.roasterFlavorTags.map((tag) => (
            <OChip key={tag} text={tag} />
          ))}
        </div>

        <div className="h-[0.5px] bg-line-1" />

        {/* Notes */}
        <div className="flex flex-col gap-s4">
          <div className="grid grid-cols-2 gap-s6">
            <div className="flex flex-col gap-s2">
              <OLabel text="Roaster" />
              <p className="font-ui text-[12px] text-ink-2 leading-[1.6]">
                {log.roasterFlavorTags.length
                  ? log.roasterFlavorTags.join(", ")
                  : "—"}
              </p>
            </div>
            <div className="flex flex-col gap-s2">
              <OLabel text="You" variant="accent" />
              <p className="font-ui text-[12px] text-ink-2 leading-[1.6]">
                {log.userFlavorTags.length ? log.userFlavorTags.join(", ") : "—"}
              </p>
            </div>
          </div>
          {isEditing ? (
            <textarea
              value={view.userTastingNotes}
              onChange={(e) => setField("userTastingNotes", e.target.value)}
              rows={3}
              placeholder="Your tasting notes..."
              className="italic font-ui text-[12px] text-ink-3 leading-relaxed"
            />
          ) : log.userTastingNotes ? (
            <p className="italic font-ui text-[12px] text-ink-3 leading-relaxed">
              {log.userTastingNotes}
            </p>
          ) : null}
        </div>

        <div className="h-[0.5px] bg-line-1" />

        {/* Rating + brew */}
        <div className="flex items-baseline justify-between">
          {isEditing ? (
            <div className="flex flex-col gap-s2 flex-1">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-[36px] text-accent">
                  {view.rating}
                </span>
                <span className="font-mono text-[10px] text-ink-4">/100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={view.rating}
                onChange={(e) => setField("rating", parseInt(e.target.value, 10))}
                className="w-full max-w-xs"
              />
            </div>
          ) : (
            <ORating score={log.rating} />
          )}
          <div className="flex flex-col items-end gap-1">
            <span
              className="font-ui font-medium text-[10px] uppercase text-ink-3"
              style={{ letterSpacing: "0.1em" }}
            >
              {log.brewMethod}
            </span>
            {log.wouldSourceAgain && (
              <span
                className="font-ui text-[10px] uppercase text-accent"
                style={{ letterSpacing: "0.1em" }}
              >
                ↻ Sourcing again
              </span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-s2">
          <div
            className="font-mono text-[9.5px] text-ink-4"
            style={{ letterSpacing: "-0.02em" }}
          >
            {new Date(log.dateConsumed).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })}
          </div>
          {log.sourcedFrom && (
            <div className="font-ui text-[11px] text-ink-3">{log.sourcedFrom}</div>
          )}
        </div>

        <div className="h-[0.5px] bg-line-1" />

        {/* Roaster info */}
        <section className="flex flex-col gap-s4">
          <div className="flex items-center justify-between">
            <OLabel text="About the Roaster" />
            {loadingRoaster && (
              <span className="font-mono text-[10px] text-ink-3">Loading…</span>
            )}
          </div>
          {roasterInfo ? (
            <div className="flex flex-col gap-s3">
              {roasterInfo.location && (
                <div className="flex items-center gap-s2 text-ink-2 font-ui text-[12px]">
                  <span className="text-accent">●</span>
                  <span>{roasterInfo.location}</span>
                  {roasterInfo.founded && (
                    <span className="text-ink-4">· Est. {roasterInfo.founded}</span>
                  )}
                </div>
              )}
              {roasterInfo.about && (
                <p className="font-ui text-[12px] text-ink-3 leading-relaxed">
                  {roasterInfo.about}
                </p>
              )}
              {roasterInfo.notable && (
                <p className="font-ui text-[10px] text-ink-4">{roasterInfo.notable}</p>
              )}
            </div>
          ) : !loadingRoaster ? (
            <p className="font-ui text-[12px] text-ink-4">
              No information found for this roaster.
            </p>
          ) : null}
        </section>

        <div className="h-[0.5px] bg-line-1" />

        <button
          type="button"
          onClick={handleDelete}
          className="font-ui font-medium text-[12px] uppercase text-ink-3 hover:text-red-300 py-s3 self-start"
          style={{ letterSpacing: "0.1em" }}
        >
          Delete log
        </button>
      </div>
    </main>
  );
}
