// Mirrors Origin/Screens/ReviewScreen.swift
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCoffeeStore } from "@/lib/store/coffee-store";
import { CoffeeBagPhoto } from "@/components/CoffeeBagPhoto";
import { OLabel } from "@/components/OLabel";
import {
  BrewMethod,
  BrewMethodAll,
  CoffeeProcess,
  CoffeeProcessAll,
  RoastLevel,
  RoastLevelAll,
  type ScanResult,
  emptyScanResult,
  scanResultToCoffeeLog,
} from "@/lib/types/models";
import { FlavorTagsAll } from "@/lib/flavor-taxonomy";
import { stringHashIndex } from "@/lib/design-tokens";

export function ReviewScreen() {
  const router = useRouter();
  const save = useCoffeeStore((s) => s.save);

  const [scan, setScan] = useState<ScanResult>(() => emptyScanResult());
  const [rating, setRating] = useState(75);
  const [wouldSourceAgain, setWouldSourceAgain] = useState(true);
  const [brew, setBrew] = useState<BrewMethod>(BrewMethod.V60);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [sourcedFrom, setSourcedFrom] = useState("");
  const [roastDateEnabled, setRoastDateEnabled] = useState(false);
  const [roastDate, setRoastDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [dateConsumed, setDateConsumed] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("origin-web:scan-result");
      if (raw) {
        const parsed = JSON.parse(raw) as ScanResult;
        setScan(parsed);
        setUserTags(parsed.roasterFlavorTags ?? []);
        if (parsed.roastDateStr) {
          // Try to slot into yyyy-MM-dd
          const d = new Date(parsed.roastDateStr);
          if (!isNaN(d.getTime())) {
            setRoastDate(d.toISOString().slice(0, 10));
            setRoastDateEnabled(true);
          }
        }
      } else {
        router.replace("/scan");
      }
    } catch {
      router.replace("/scan");
    }
  }, [router]);

  const avgConfidence = useMemo(() => {
    const v = Object.values(scan.confidence);
    if (v.length === 0) return 0;
    return v.reduce((a, b) => a + b, 0) / v.length;
  }, [scan.confidence]);

  const colorIndex = stringHashIndex(scan.roaster || "");

  const flavorPool = useMemo(() => {
    const head = scan.roasterFlavorTags;
    const rest = FlavorTagsAll.filter((t) => !head.includes(t));
    return [...head, ...rest];
  }, [scan.roasterFlavorTags]);

  function patch<K extends keyof ScanResult>(k: K, v: ScanResult[K]) {
    setScan((s) => ({ ...s, [k]: v }));
  }

  function toggleTag(tag: string) {
    setUserTags((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
    );
  }

  function handleSave() {
    const log = scanResultToCoffeeLog(scan, {
      rating,
      wouldSourceAgain,
      brewMethod: brew,
      userFlavorTags: userTags,
      userTastingNotes: notes,
      sourcedFrom: sourcedFrom.trim() || undefined,
      dateConsumed: new Date(dateConsumed).toISOString(),
      bagPhotoDataUrl: scan.bagPhotoDataUrl,
    });
    if (roastDateEnabled) {
      log.roastDate = new Date(roastDate).toISOString();
    }
    save(log);
    try {
      sessionStorage.removeItem("origin-web:scan-result");
    } catch {
      /* ignore */
    }
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-bg-0 pb-[140px]">
      <div className="max-w-3xl mx-auto">
        {/* Fixed header */}
        <header className="pt-[56px] pb-s4 px-s5 flex flex-col gap-s3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-[2px]">
              <h1 className="font-display text-[22px] text-ink-1">Review Scan</h1>
              <span className="font-ui text-[10px] text-ink-4">
                Tap any field to edit
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/scan")}
              className="w-8 h-8 rounded-r2 bg-bg-2 text-ink-2 flex items-center justify-center"
              aria-label="Cancel review"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          {/* Summary card */}
          <div className="flex items-center gap-s3">
            <CoffeeBagPhoto
              width={42}
              height={56}
              colorIndex={colorIndex}
              country={scan.originCountry || null}
              roaster={scan.roaster || null}
              photoDataUrl={scan.bagPhotoDataUrl}
            />
            <div className="flex-1 flex flex-col gap-s2">
              <span className="font-ui text-[11px] text-ink-1 truncate">
                {scan.roaster || "Unknown Roaster"}
              </span>
              <div className="flex flex-col gap-1">
                <OLabel text="AI Confidence" />
                <div className="h-[3px] bg-bg-4 rounded-r1 overflow-hidden">
                  <div
                    className="h-full bg-accent/80"
                    style={{ width: `${Math.round(avgConfidence * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="h-[0.5px] bg-line-1" />

        {/* AI fields */}
        <FieldRow
          label="ROASTER"
          value={scan.roaster}
          onChange={(v) => patch("roaster", v)}
          confidence={scan.confidence.roaster ?? 0}
        />
        <FieldRow
          label="COFFEE"
          value={scan.coffeeName}
          onChange={(v) => patch("coffeeName", v)}
          confidence={scan.confidence.coffee ?? 0}
        />
        <FieldRow
          label="COUNTRY"
          value={scan.originCountry}
          onChange={(v) => patch("originCountry", v)}
          confidence={scan.confidence.country ?? 0}
        />
        <FieldRow
          label="REGION"
          value={scan.originRegion}
          onChange={(v) => patch("originRegion", v)}
          confidence={0}
        />

        <SegmentedRow
          label="PROCESS"
          options={CoffeeProcessAll}
          selected={scan.process}
          onSelect={(v) => patch("process", v as CoffeeProcess)}
        />
        <SegmentedRow
          label="ROAST"
          options={RoastLevelAll}
          selected={scan.roastLevel}
          onSelect={(v) => patch("roastLevel", v as RoastLevel)}
        />
        <FieldRow
          label="VARIETY"
          value={scan.variety}
          onChange={(v) => patch("variety", v)}
          confidence={0}
        />
        <FieldRow
          label="ALTITUDE"
          value={scan.altitudeMASL}
          onChange={(v) => patch("altitudeMASL", v)}
          confidence={0}
        />

        {/* Roast date */}
        <div className="px-s5 py-s3 border-b border-line-1 flex items-center gap-s3">
          <span
            className="font-ui text-[10px] uppercase text-ink-4 w-[80px]"
            style={{ letterSpacing: "0.1em" }}
          >
            Roast Date
          </span>
          <label className="inline-flex items-center gap-s2 text-ink-3">
            <input
              type="checkbox"
              checked={roastDateEnabled}
              onChange={(e) => setRoastDateEnabled(e.target.checked)}
              className="accent-accent"
            />
            <span className="font-ui text-[12px]">On bag</span>
          </label>
          {roastDateEnabled ? (
            <input
              type="date"
              value={roastDate}
              onChange={(e) => setRoastDate(e.target.value)}
              className="font-ui text-[12px] text-ink-1"
            />
          ) : (
            <span className="font-ui text-[10px] text-ink-4">Not on bag</span>
          )}
        </div>

        <div className="h-[0.5px] bg-line-1 my-s4" />

        {/* Rating */}
        <div className="px-s5 flex flex-col gap-s3 pb-s4">
          <OLabel text="Rating" />
          <p className="font-ui text-[10px] text-ink-4">
            Drag the slider · tap +/− for fine control
          </p>
          <div className="bg-bg-2 rounded-r4 flex items-center">
            <button
              type="button"
              onClick={() => setRating((r) => Math.max(0, r - 1))}
              className="w-14 h-[72px] text-ink-3 text-2xl"
              aria-label="Decrease rating"
            >
              −
            </button>
            <div className="flex-1 flex flex-col items-center gap-s2 py-s2">
              <div className="flex items-baseline gap-[3px]">
                <span className="font-display text-[52px] leading-none text-accent">
                  {rating}
                </span>
                <span className="font-mono text-[12px] text-ink-4">/ 100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value, 10))}
                className="w-3/4 max-w-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setRating((r) => Math.min(100, r + 1))}
              className="w-14 h-[72px] text-ink-3 text-2xl"
              aria-label="Increase rating"
            >
              +
            </button>
          </div>
        </div>

        <div className="h-[0.5px] bg-line-1 my-s4" />

        {/* Brew method */}
        <div className="flex flex-col gap-s3 pb-s4">
          <div className="px-s5">
            <OLabel text="Brew Method" />
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-s2 px-s5">
              {BrewMethodAll.map((m) => {
                const on = brew === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBrew(m)}
                    className={`px-s3 py-s2 rounded-r2 font-ui font-medium text-[10px] uppercase whitespace-nowrap ${
                      on
                        ? "bg-accent text-accent-ink"
                        : "bg-bg-3 text-ink-2"
                    }`}
                    style={{ letterSpacing: "0.08em" }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Source again */}
        <div className="px-s5 py-s4 flex items-center justify-between border-b border-line-1">
          <OLabel text="Source Again" />
          <label className="inline-flex items-center gap-s2">
            <input
              type="checkbox"
              checked={wouldSourceAgain}
              onChange={(e) => setWouldSourceAgain(e.target.checked)}
              className="accent-accent w-4 h-4"
            />
          </label>
        </div>

        <div className="h-[0.5px] bg-line-1 my-s4" />

        {/* Flavor tags */}
        <div className="pb-s4">
          <div className="px-s5 flex flex-col gap-1">
            <OLabel text="Your Flavors" />
            <span className="font-ui text-[10px] text-ink-4">
              What did you actually taste? Tap to confirm or remove.
            </span>
          </div>
          <div className="overflow-x-auto no-scrollbar mt-s3">
            <div className="flex gap-s2 px-s5 flex-wrap max-w-3xl">
              {flavorPool.map((tag) => {
                const on = userTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-s3 py-s2 rounded-r2 font-ui font-medium text-[10px] uppercase whitespace-nowrap border ${
                      on
                        ? "bg-accent text-accent-ink border-transparent"
                        : "bg-bg-3 text-ink-3 border-line-2"
                    }`}
                    style={{ letterSpacing: "0.08em", borderWidth: "0.5px" }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="h-[0.5px] bg-line-1 my-s4" />

        {/* Tasting notes */}
        <div className="px-s5 pb-s4 flex flex-col gap-s3">
          <OLabel text="Tasting Notes" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it taste? Anything specific — acidity, body, aftertaste..."
            rows={3}
            className="font-ui text-[12px] text-ink-1 leading-relaxed"
          />
        </div>

        <div className="h-[0.5px] bg-line-1" />

        {/* Sourced from */}
        <div className="px-s5 py-s4 flex items-center gap-s3 border-b border-line-1">
          <span
            className="font-ui text-[10px] uppercase text-ink-4 w-[92px]"
            style={{ letterSpacing: "0.1em" }}
          >
            Sourced From
          </span>
          <input
            value={sourcedFrom}
            onChange={(e) => setSourcedFrom(e.target.value)}
            placeholder="Shop, website, market..."
            className="font-ui text-[13px] text-ink-1 flex-1"
          />
        </div>

        {/* Date consumed */}
        <div className="px-s5 py-s3 flex items-center gap-s3 border-b border-line-1">
          <span
            className="font-ui text-[10px] uppercase text-ink-4 w-[80px]"
            style={{ letterSpacing: "0.1em" }}
          >
            Date
          </span>
          <input
            type="date"
            value={dateConsumed}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDateConsumed(e.target.value)}
            className="font-ui text-[12px] text-ink-1"
          />
        </div>
      </div>

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-0 bg-bg-0 border-t border-line-2 z-40">
        <div className="max-w-3xl mx-auto px-s5 py-s4">
          <button
            type="button"
            onClick={handleSave}
            className="w-full bg-accent text-accent-ink font-ui font-medium text-[12px] uppercase rounded-r2 py-[14px]"
            style={{ letterSpacing: "0.1em" }}
          >
            Save to Library
          </button>
        </div>
      </div>
    </main>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  confidence,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  confidence: number;
}) {
  return (
    <div className="px-s5 py-s3 flex items-center gap-s3 border-b border-line-1">
      <span
        className="font-ui text-[10px] uppercase text-ink-4 w-[58px]"
        style={{ letterSpacing: "0.1em" }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Add ${label.toLowerCase()}...`}
        className="font-ui text-[13px] text-ink-1 flex-1"
      />
      <span
        className="w-4 h-4 rounded-pill border border-accent flex-shrink-0"
        style={{ background: confidence > 0.7 ? "var(--accent)" : "transparent" }}
      />
    </div>
  );
}

function SegmentedRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="border-b border-line-1 py-s3">
      <div
        className="px-s5 font-ui text-[10px] uppercase text-ink-4"
        style={{ letterSpacing: "0.1em" }}
      >
        {label}
      </div>
      <div className="overflow-x-auto no-scrollbar mt-s2">
        <div className="flex gap-s2 px-s5">
          {options.map((opt) => {
            const on = opt === selected;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onSelect(opt)}
                className={`px-s3 py-s2 rounded-r2 font-ui font-medium text-[10px] uppercase whitespace-nowrap ${
                  on ? "bg-accent text-accent-ink" : "bg-bg-3 text-ink-2"
                }`}
                style={{ letterSpacing: "0.08em" }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
