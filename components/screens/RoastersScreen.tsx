// Roasters — a curated, ranked directory of independent Indian specialty
// roasters. Mirrors the header + horizontal filter-tab pattern of LibraryScreen.
"use client";

import { useMemo, useState } from "react";
import { OChip } from "@/components/OChip";
import {
  rankedRoasters,
  roasterStates,
  roasterLink,
  roasterLinkLabel,
  RANK_AXES,
  type RankedRoaster,
} from "@/lib/data/roasters";

export function RoastersScreen() {
  const [filter, setFilter] = useState<string>("All");

  const ranked = useMemo(() => rankedRoasters(), []);
  const states = useMemo(() => ["All", ...roasterStates()], []);

  const filtered = useMemo(() => {
    if (filter === "All") return ranked;
    return ranked.filter((r) => r.state === filter);
  }, [filter, ranked]);

  return (
    <main className="min-h-screen pb-[112px]">
      <header className="pt-[60px] pb-s4 px-s5 max-w-3xl mx-auto flex items-end justify-between">
        <div className="flex flex-col gap-[2px]">
          <h1 className="font-display text-[36px] text-ink-1 leading-none">Roasters</h1>
          <span
            className="font-ui text-[10px] uppercase text-ink-3"
            style={{ letterSpacing: "0.1em" }}
          >
            Independent · Ranked
          </span>
        </div>
        <span className="font-mono text-[13px] text-ink-3">{ranked.length}</span>
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

      <ul className="max-w-3xl mx-auto">
        {filtered.map((r) => (
          <RoasterRow key={r.name} roaster={r} />
        ))}
      </ul>

      <div className="max-w-3xl mx-auto px-s5 pt-s6 flex flex-col gap-s2">
        <p className="font-ui text-[11px] text-ink-4 leading-relaxed">
          Ranked on a balanced scorecard: cup quality, sourcing, innovation,
          reputation and influence, each scored out of 20 for a total out of 100.
          Scores come from a research pass across awards, competitions, press and
          barista esteem, so they are directional and subjective. Newer or smaller
          roasters can cup beautifully yet rank lower, recognition takes years.
        </p>
        <p className="font-ui text-[11px] text-ink-4 leading-relaxed">
          A hand-picked, non-exhaustive list. Spotted one worth adding? It is easy
          to grow the list.
        </p>
      </div>
    </main>
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

function RoasterRow({ roaster }: { roaster: RankedRoaster }) {
  const location = [roaster.city, roaster.state]
    .filter(Boolean)
    // Drop a redundant second entry when city == state (e.g. Puducherry).
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" · ");
  const topThree = roaster.rank <= 3;

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

          {/* Score breakdown */}
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
            <div className="flex flex-wrap gap-s2">
              {roaster.tags.map((t) => (
                <OChip key={t} text={t} />
              ))}
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
