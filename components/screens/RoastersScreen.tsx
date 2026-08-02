// Roasters — a curated directory of independent Indian specialty roasters.
// Mirrors the header + horizontal filter-tab pattern used by LibraryScreen.
"use client";

import { useMemo, useState } from "react";
import { OChip } from "@/components/OChip";
import {
  ROASTERS,
  roasterStates,
  roasterLink,
  roasterLinkLabel,
  type Roaster,
} from "@/lib/data/roasters";

export function RoastersScreen() {
  const [filter, setFilter] = useState<string>("All");

  const states = useMemo(() => ["All", ...roasterStates()], []);

  const filtered = useMemo(() => {
    if (filter === "All") return ROASTERS;
    return ROASTERS.filter((r) => r.state === filter);
  }, [filter]);

  return (
    <main className="min-h-screen pb-[112px]">
      <header className="pt-[60px] pb-s4 px-s5 max-w-3xl mx-auto flex items-end justify-between">
        <div className="flex flex-col gap-[2px]">
          <h1 className="font-display text-[36px] text-ink-1 leading-none">Roasters</h1>
          <span
            className="font-ui text-[10px] uppercase text-ink-3"
            style={{ letterSpacing: "0.1em" }}
          >
            Indian Specialty · Independent
          </span>
        </div>
        <span className="font-mono text-[13px] text-ink-3">{ROASTERS.length}</span>
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

      <p className="max-w-3xl mx-auto px-s5 pt-s6 font-ui text-[11px] text-ink-4 leading-relaxed">
        A hand-picked, non-exhaustive list of independent specialty roasters.
        Spotted one worth adding? It is easy to grow the list.
      </p>
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

function RoasterRow({ roaster }: { roaster: Roaster }) {
  const location = [roaster.city, roaster.state]
    .filter(Boolean)
    // Drop a redundant second entry when city == state (e.g. Puducherry).
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" · ");

  return (
    <li className="border-b border-line-1">
      <a
        href={roasterLink(roaster)}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-s5 py-s4 hover:bg-bg-1/40 transition-colors"
      >
        <div className="flex items-baseline justify-between gap-s3">
          <div className="font-display font-bold text-[20px] text-ink-1 leading-tight">
            {roaster.name}
          </div>
          {roaster.founded && (
            <span className="font-mono text-[12px] text-ink-3 shrink-0">
              {roaster.founded}
            </span>
          )}
        </div>

        <div
          className="font-ui text-[11px] uppercase text-ink-4 mt-1"
          style={{ letterSpacing: "0.12em" }}
        >
          {location}
        </div>

        <p className="font-ui text-[13px] text-ink-2 mt-s2 leading-relaxed">
          {roaster.note}
        </p>

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
      </a>
    </li>
  );
}
