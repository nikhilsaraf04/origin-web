// Roasters — a curated, ranked directory of independent Indian specialty
// roasters, each with its flagship whole-bean coffee matched to your taste.
"use client";

import { useMemo, useState } from "react";
import { OChip } from "@/components/OChip";
import { OLabel } from "@/components/OLabel";
import { useCoffeeStore } from "@/lib/store/coffee-store";
import {
  computeTasteProfile,
  isProfileReady,
  TasteProfileMinLogs,
} from "@/lib/types/taste-profile";
import { computeMatchScore, type MatchScore } from "@/lib/services/match-score";
import {
  rankedRoasters,
  roasterStates,
  roasterLink,
  roasterLinkLabel,
  flagshipScanResult,
  RANK_AXES,
  type RankedRoaster,
} from "@/lib/data/roasters";

type SortKey = "rank" | "match";

export function RoastersScreen() {
  const logs = useCoffeeStore((s) => s.logs);
  const [filter, setFilter] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("rank");

  const ranked = useMemo(() => rankedRoasters(), []);
  const states = useMemo(() => ["All", ...roasterStates()], []);

  // Taste profile from the user's own logged coffees (needs >= 5 logs).
  const profile = useMemo(
    () => (logs.length >= TasteProfileMinLogs ? computeTasteProfile(logs) : null),
    [logs],
  );
  const profileReady = isProfileReady(profile);

  // Match each roaster's flagship against the taste profile.
  const matches = useMemo(() => {
    const m = new Map<string, MatchScore | null>();
    for (const r of ranked) {
      m.set(
        r.name,
        r.flagship && isProfileReady(profile)
          ? computeMatchScore(flagshipScanResult(r.flagship), profile)
          : null,
      );
    }
    return m;
  }, [ranked, profile]);

  const effectiveSort: SortKey = sort === "match" && profileReady ? "match" : "rank";

  const filtered = useMemo(() => {
    const base = filter === "All" ? ranked : ranked.filter((r) => r.state === filter);
    if (effectiveSort === "match") {
      return [...base].sort(
        (a, b) =>
          (matches.get(b.name)?.score ?? -1) - (matches.get(a.name)?.score ?? -1) ||
          a.rank - b.rank,
      );
    }
    return base;
  }, [filter, ranked, effectiveSort, matches]);

  return (
    <main className="min-h-screen pb-[112px]">
      <header className="pt-[60px] pb-s4 px-s5 max-w-3xl mx-auto flex items-end justify-between gap-s4">
        <div className="flex flex-col gap-[2px]">
          <h1 className="font-display text-[36px] text-ink-1 leading-none">Roasters</h1>
          <span
            className="font-ui text-[10px] uppercase text-ink-3"
            style={{ letterSpacing: "0.1em" }}
          >
            Independent · Ranked
          </span>
        </div>
        <SortToggle sort={effectiveSort} matchEnabled={profileReady} onChange={setSort} />
      </header>

      <div className="max-w-3xl mx-auto">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex px-s5 min-w-max">
            {states.map((opt) => (
              <FilterTab
                key={opt}
                label={opt}
                active={filter === opt}
                onClick={() => setFilter(opt)}
              />
            ))}
          </div>
        </div>
        <div className="h-[0.5px] bg-line-2" />
      </div>

      {!profileReady && (
        <div className="max-w-3xl mx-auto px-s5 pt-s3">
          <p className="font-ui text-[11px] text-ink-4 leading-relaxed">
            {logs.length === 0
              ? "Scan and rate 5 coffees to unlock your taste match on each roaster's flagship."
              : `Log ${TasteProfileMinLogs - logs.length} more ${
                  TasteProfileMinLogs - logs.length === 1 ? "coffee" : "coffees"
                } to unlock your taste match.`}
          </p>
        </div>
      )}

      <ul className="max-w-3xl mx-auto">
        {filtered.map((r) => (
          <RoasterRow key={r.name} roaster={r} match={matches.get(r.name) ?? null} />
        ))}
      </ul>

      <div className="max-w-3xl mx-auto px-s5 pt-s6 flex flex-col gap-s2">
        <p className="font-ui text-[11px] text-ink-4 leading-relaxed">
          Ranked on a balanced scorecard: cup quality, sourcing, innovation,
          reputation and influence, each out of 20 for a total out of 100. The
          match score compares each roaster's flagship bean to your own taste
          profile, so it is personal to your logged coffees.
        </p>
        <p className="font-ui text-[11px] text-ink-4 leading-relaxed">
          Scores are directional and subjective. Flagship picks marked with ~ are
          the roaster's house style where a specific top bean was not confirmed.
        </p>
      </div>
    </main>
  );
}

function SortToggle({
  sort,
  matchEnabled,
  onChange,
}: {
  sort: SortKey;
  matchEnabled: boolean;
  onChange: (s: SortKey) => void;
}) {
  return (
    <div className="flex items-center gap-[2px] shrink-0">
      {(["rank", "match"] as const).map((key) => {
        const active = sort === key;
        const disabled = key === "match" && !matchEnabled;
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(key)}
            className="font-ui text-[10px] uppercase px-s3 py-[6px] rounded-r2 border transition-colors"
            style={{
              letterSpacing: "0.1em",
              borderWidth: "0.5px",
              borderColor: active ? "var(--accent-border)" : "var(--line-2)",
              background: active ? "var(--accent-dim)" : "transparent",
              color: disabled
                ? "var(--ink-4)"
                : active
                  ? "var(--accent)"
                  : "var(--ink-3)",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-stretch">
      <span
        className={`font-ui text-[11px] uppercase px-s4 py-s3 ${
          active ? "text-ink-1 font-medium" : "text-ink-3"
        }`}
        style={{ letterSpacing: "0.1em" }}
      >
        {label}
      </span>
      <div
        className="h-[1.5px]"
        style={{ background: active ? "var(--accent)" : "transparent" }}
      />
    </button>
  );
}

function prettyTag(tag: string): string {
  return tag.replace(/-/g, " ");
}

function RoasterRow({
  roaster,
  match,
}: {
  roaster: RankedRoaster;
  match: MatchScore | null;
}) {
  const location = [roaster.city, roaster.state]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" · ");
  const topThree = roaster.rank <= 3;
  const f = roaster.flagship;
  const meta = f
    ? [
        f.kind === "single-origin" ? "Single origin" : "Blend",
        f.process,
        f.roastLevel,
        f.originRegion,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <li className="border-b border-line-1">
      <a
        href={roasterLink(roaster)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-stretch gap-s4 px-s5 py-s4 hover:bg-bg-1/40 transition-colors"
      >
        {/* Rank */}
        <div className="w-[34px] shrink-0 flex flex-col items-center pt-[3px]">
          <span
            className={`font-mono text-[16px] leading-none ${
              topThree ? "text-accent" : "text-ink-3"
            }`}
          >
            {roaster.rank}
          </span>
          <span
            className="font-ui text-[8px] uppercase text-ink-4 mt-[3px]"
            style={{ letterSpacing: "0.1em" }}
          >
            Rank
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-s3">
            <div className="min-w-0">
              <div className="font-display font-bold text-[20px] text-ink-1 leading-tight">
                {roaster.name}
              </div>
              <div
                className="font-ui text-[10px] uppercase text-ink-4 mt-1"
                style={{ letterSpacing: "0.12em" }}
              >
                {location}
                {roaster.founded ? ` · ${roaster.founded}` : ""}
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end leading-none">
              <span className="font-mono text-[24px] text-accent">{roaster.score}</span>
              <span className="font-mono text-[10px] text-ink-4 mt-[2px]">/ 100</span>
            </div>
          </div>

          <p className="font-ui text-[13px] text-ink-2 mt-s2 leading-relaxed">
            {roaster.note}
          </p>

          {/* Flagship bean + taste match */}
          {f && (
            <div className="mt-s3 rounded-r4 border border-line-2 bg-bg-1/40 p-s3">
              <div className="flex items-start justify-between gap-s3">
                <div className="min-w-0">
                  <OLabel text="Top bean" variant="accent" />
                  <div className="font-ui font-medium text-[14px] text-ink-1 mt-[3px] truncate">
                    {f.approx ? "~ " : ""}
                    {f.name}
                  </div>
                  <div className="font-ui text-[11px] text-ink-3 mt-[2px]">{meta}</div>
                </div>
                <div className="shrink-0 flex flex-col items-end leading-none pl-s2">
                  {match ? (
                    <span className="font-mono text-[22px] text-accent">
                      {match.score}
                      <span className="text-[12px] text-ink-3">%</span>
                    </span>
                  ) : (
                    <span className="font-mono text-[22px] text-ink-4">—</span>
                  )}
                  <span
                    className="font-ui text-[8px] uppercase text-ink-4 mt-[3px]"
                    style={{ letterSpacing: "0.12em" }}
                  >
                    Match
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-s2 mt-s2">
                {f.flavorTags.map((t) => (
                  <OChip key={t} text={prettyTag(t)} />
                ))}
              </div>
              {match?.reason && (
                <div className="font-ui text-[11px] text-ink-3 mt-s2 leading-snug">
                  {match.reason}
                </div>
              )}
            </div>
          )}

          {/* Ranking breakdown */}
          <div className="flex flex-wrap gap-x-s4 gap-y-1 mt-s3">
            {RANK_AXES.map((axis) => (
              <span key={axis.key} className="flex items-baseline gap-[5px]">
                <span
                  className="font-ui text-[9px] uppercase text-ink-4"
                  style={{ letterSpacing: "0.08em" }}
                >
                  {axis.label}
                </span>
                <span className="font-mono text-[11px] text-ink-2">
                  {roaster.scores[axis.key]}
                </span>
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between gap-s3 mt-s3">
            <div className="font-ui text-[10px] uppercase text-ink-4" style={{ letterSpacing: "0.1em" }}>
              {roaster.tags[0]}
            </div>
            <span className="font-mono text-[11px] text-accent shrink-0 whitespace-nowrap">
              {roasterLinkLabel(roaster)} ↗
            </span>
          </div>
        </div>
      </a>
    </li>
  );
}
