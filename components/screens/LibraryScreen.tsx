// Mirrors Origin/Screens/LibraryScreen.swift
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCoffeeStore } from "@/lib/store/coffee-store";
import { CoffeeBagPhoto } from "@/components/CoffeeBagPhoto";
import { OChip } from "@/components/OChip";
import { stringHashIndex } from "@/lib/design-tokens";

export function LibraryScreen() {
  const logs = useCoffeeStore((s) => s.logs);
  const [filter, setFilter] = useState<string>("All");

  const filterOptions = useMemo(() => {
    const countries = Array.from(new Set(logs.map((l) => l.originCountry))).sort();
    const processes = Array.from(new Set(logs.map((l) => l.process))).sort();
    return ["All", ...countries, ...processes];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (filter === "All") return logs;
    return logs.filter(
      (l) => l.originCountry === filter || l.process === filter,
    );
  }, [filter, logs]);

  return (
    <main className="min-h-screen pb-[112px]">
      <header className="pt-[60px] pb-s4 px-s5 max-w-3xl mx-auto flex items-end justify-between">
        <div className="flex flex-col gap-[2px]">
          <h1 className="font-display text-[36px] text-ink-1 leading-none">Origin</h1>
          <span
            className="font-ui text-[10px] uppercase text-ink-3"
            style={{ letterSpacing: "0.1em" }}
          >
            Your Coffee Library
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex px-s5 min-w-max">
            {filterOptions.map((opt) => (
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

      {filteredLogs.length === 0 ? (
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center gap-s3 py-[120px] text-ink-4">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
            <path d="M6 1v3" />
            <path d="M10 1v3" />
            <path d="M14 1v3" />
          </svg>
          <p className="font-display text-[20px] text-ink-3">Scan your first bag</p>
        </div>
      ) : (
        <ul className="max-w-3xl mx-auto">
          {filteredLogs.map((log) => (
            <CoffeeRow key={log.id} log={log} />
          ))}
        </ul>
      )}
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
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-stretch"
    >
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

function CoffeeRow({ log }: { log: ReturnType<typeof useCoffeeStore.getState>["logs"][number] }) {
  const colorIndex = stringHashIndex(log.roaster);
  const originLine = [log.originCountry, log.originRegion, log.process]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="border-b border-line-1">
      <Link
        href={`/detail/${log.id}`}
        className="flex items-stretch gap-[14px] px-s5 py-s4 hover:bg-bg-1/40 transition-colors"
      >
        <CoffeeBagPhoto
          width={70}
          height={94}
          colorIndex={colorIndex}
          country={log.originCountry}
          roaster={log.roaster}
          photoDataUrl={log.bagPhotoDataUrl}
        />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div
            className="font-ui text-[10px] uppercase text-ink-4"
            style={{ letterSpacing: "0.16em" }}
          >
            {log.roaster}
          </div>
          <div className="font-display font-bold text-[20px] text-ink-1 leading-tight line-clamp-2">
            {log.coffeeName}
          </div>
          <div className="font-ui text-[11px] text-ink-3 truncate">{originLine}</div>
          <div className="flex items-center justify-between mt-auto">
            <OChip text={log.roastLevel} />
            <span className="font-mono text-[17px] text-accent">{log.rating}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}
