// Mirrors Origin/Screens/YourPaletteScreen.swift
"use client";

import { useMemo } from "react";
import { useCoffeeStore } from "@/lib/store/coffee-store";
import { OBarChart } from "@/components/OBarChart";
import { OChip } from "@/components/OChip";
import { OLabel } from "@/components/OLabel";
import {
  TasteProfileMinLogs,
  computeTasteProfile,
  type RankedItem,
} from "@/lib/types/taste-profile";

export function PaletteScreen() {
  const logs = useCoffeeStore((s) => s.logs);
  // Compute the profile in a memo so Zustand's getServerSnapshot stays stable.
  // (Calling tasteProfile() inside the selector returns a new object every
  // render and triggers the infinite-loop warning in React 18+.)
  const profile = useMemo(
    () => (logs.length >= TasteProfileMinLogs ? computeTasteProfile(logs) : null),
    [logs],
  );

  return (
    <main className="min-h-screen pb-[112px] max-w-3xl mx-auto">
      <h1 className="font-display text-[34px] text-ink-1 px-s5 pt-[60px] pb-s6">
        Your Palate
      </h1>

      <div className="px-s5 pb-s6 flex items-stretch">
        <Stat
          value={profile ? `${profile.totalLogged}` : `${logs.length}`}
          label="Coffees"
        />
        <div className="w-[0.5px] bg-line-2 self-stretch" />
        <Stat
          value={profile ? `${profile.totalCountries}` : "0"}
          label="Countries"
        />
        <div className="w-[0.5px] bg-line-2 self-stretch" />
        <Stat
          value={profile ? `${Math.round(profile.avgRating)}` : "—"}
          label="Avg Score"
        />
      </div>

      {profile ? (
        <div className="flex flex-col gap-s6 px-s5">
          <Divider />

          <Section title="Top Origins">
            <OBarChart items={toBars(profile.topOrigins.slice(0, 5))} />
          </Section>

          <Divider />

          <Section title="Roast Preference">
            <OBarChart items={toBars(profile.topRoastLevels)} />
          </Section>

          <Divider />

          <Section title="Process">
            <div className="flex flex-wrap gap-s2">
              {profile.topProcesses.map((p) => (
                <span
                  key={p.id}
                  className="px-[10px] py-[4px] rounded-r2 bg-bg-3 border border-line-2 flex items-center gap-1"
                  style={{ borderWidth: "0.5px" }}
                >
                  <span
                    className="font-ui font-medium text-[10px] uppercase text-ink-2"
                    style={{ letterSpacing: "0.08em" }}
                  >
                    {p.label}
                  </span>
                  <span className="font-mono text-[10px] text-ink-3">
                    {Math.round(p.normalizedScore * 100)}%
                  </span>
                </span>
              ))}
            </div>
          </Section>

          <Divider />

          <Section title="Flavor Profile">
            <div className="flex flex-wrap gap-s2">
              {profile.topFlavorTags.slice(0, 12).map((tag) => (
                <OChip
                  key={tag.id}
                  text={tag.label}
                  highlighted={tag.normalizedScore > 0.7}
                />
              ))}
            </div>
          </Section>

          {profile.topVarieties.length > 0 && (
            <>
              <Divider />
              <Section title="Varieties">
                <OBarChart items={toBars(profile.topVarieties.slice(0, 5))} />
              </Section>
            </>
          )}
        </div>
      ) : (
        <div className="py-s8 px-s5 text-center text-ink-3 font-ui text-[14px]">
          Log {TasteProfileMinLogs - logs.length} more to unlock your taste profile.
        </div>
      )}
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <span className="font-mono text-[30px] text-accent">{value}</span>
      <span
        className="font-ui text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: "0.1em" }}
      >
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-[0.5px] bg-line-1" />;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-s3">
      <OLabel text={title} />
      {children}
    </section>
  );
}

function toBars(items: RankedItem[]) {
  return items.map((i) => ({
    id: i.id,
    label: i.label,
    value: i.normalizedScore,
    displayValue: `${Math.round(i.avgRating)}`,
  }));
}
