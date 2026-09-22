// Best 100 - The World's 100 Best Coffee Shops, all four editions
// (World, Europe, N. America, S. America) as one browsable ranked list.
// Approved design: v4 mock, live tokens.
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { OChip } from "@/components/OChip";
import { useBest100Marks } from "@/lib/store/best100-marks";
import {
  best100Shops,
  displayRank,
  editionChips,
  placeLine,
  type Best100Shop,
} from "@/lib/best100";

const EDITION_TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "world", label: "World" },
  { key: "europe", label: "Europe" },
  { key: "north", label: "N. America" },
  { key: "south", label: "S. America" },
];

export function Best100Screen() {
  const [edition, setEdition] = useState<string>("all");
  const [cityQuery, setCityQuery] = useState<string>("");
  const marks = useBest100Marks((s) => s.marks);
  const toggleVisited = useBest100Marks((s) => s.toggleVisited);

  const filtered = useMemo(() => {
    let result = best100Shops;
    if (edition !== "all") {
      result = result.filter((s) => s.editions[edition] != null);
    }
    const q = cityQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          (s.city ?? "").toLowerCase().includes(q) ||
          (s.country ?? "").toLowerCase().includes(q),
      );
    }
    const rankOf = (s: Best100Shop) =>
      edition === "all" ? displayRank(s) : (s.editions[edition] ?? 999);
    // In "all", World-listed shops lead by World rank, then the rest.
    const groupOf = (s: Best100Shop) =>
      edition === "all" && s.editions.world == null ? 1 : 0;
    return [...result].sort(
      (a, b) => groupOf(a) - groupOf(b) || rankOf(a) - rankOf(b),
    );
  }, [edition, cityQuery]);

  const visitedCount = useMemo(
    () => filtered.filter((s) => marks[s.id]?.visited).length,
    [filtered, marks],
  );

  return (
    <main className="min-h-screen pb-[160px]">
      <header className="pt-[60px] pb-s4 px-s5 max-w-3xl mx-auto flex items-end justify-between">
        <div className="flex flex-col gap-[2px]">
          <h1 className="font-display text-[36px] text-ink-1 leading-none">Best 100</h1>
          <span
            className="font-ui font-medium text-[10px] uppercase text-ink-3"
            style={{ letterSpacing: "0.14em" }}
          >
            The World&apos;s 100 Best · 2026 edition
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex px-s5 min-w-max justify-between w-full">
            {EDITION_TABS.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setEdition(tab.key)}>
                <span
                  className={`block font-ui text-[10px] uppercase px-[9px] py-s3 ${
                    edition === tab.key ? "text-ink-1 font-medium" : "text-ink-3"
                  }`}
                  style={{ letterSpacing: "0.08em" }}
                >
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="h-[0.5px] bg-line-2" />

        <div
          className="px-s5 py-s3 font-ui font-medium text-[10px] uppercase border-b border-line-1"
          style={{ letterSpacing: "0.14em" }}
        >
          <span className="text-accent">{visitedCount} visited</span>
          <span className="text-ink-3">
            {"  ·  "}
            {filtered.length - visitedCount} to go{"  ·  "}4 editions combined
          </span>
        </div>

        <div className="px-s5 py-s3 flex items-center gap-[10px] border-b border-line-1">
          <span className="font-ui text-[11px] text-ink-3">Filter by city</span>
          <input
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            placeholder="e.g. London"
            autoCapitalize="words"
            autoCorrect="off"
            className="flex-1 bg-transparent font-ui font-medium text-[12px] text-ink-2 placeholder:text-ink-4 outline-none"
          />
        </div>
      </div>

      <ul className="max-w-3xl mx-auto">
        {filtered.map((shop) => (
          <ShopRow
            key={shop.id}
            shop={shop}
            visited={marks[shop.id]?.visited === true}
            onToggleVisited={() => toggleVisited(shop.id)}
          />
        ))}
      </ul>
    </main>
  );
}

function ShopRow({
  shop,
  visited,
  onToggleVisited,
}: {
  shop: Best100Shop;
  visited: boolean;
  onToggleVisited: () => void;
}) {
  return (
    <li className="relative">
      <Link
        href={`/best100/${shop.id}`}
        className="flex items-start gap-[14px] pl-s5 pr-[54px] py-s4"
      >
        <span className="font-mono text-[17px] text-accent w-[34px] shrink-0 pt-[2px]">
          {displayRank(shop)}
        </span>
        <span className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="font-display font-bold text-[20px] text-ink-1 leading-tight line-clamp-2">
            {shop.name}
          </span>
          <span className="font-ui text-[11px] text-ink-3">{placeLine(shop)}</span>
          <span className="flex flex-wrap gap-s2 pt-1">
            {editionChips(shop).map((c) => (
              <OChip
                key={c.label}
                text={`${c.label} #${c.rank}`}
                highlighted={c.rank === 1}
              />
            ))}
          </span>
        </span>
      </Link>
      <div className="absolute bottom-0 left-[54px] right-0 h-[0.5px] bg-line-1" />
      <button
        type="button"
        onClick={onToggleVisited}
        aria-label={visited ? "Mark not visited" : "Mark visited"}
        className="absolute right-s5 top-s4 w-[22px] h-[22px] rounded-full flex items-center justify-center"
        style={{
          border: `0.5px solid ${visited ? "var(--accent-border)" : "var(--color-line-3, #2C3E52)"}`,
          background: visited ? "var(--accent-dim)" : "transparent",
        }}
      >
        {visited && (
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </button>
    </li>
  );
}
