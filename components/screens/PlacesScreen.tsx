// Places — every cup you had somewhere, and what that adds up to.
//
// The stat row is the point of the screen: a visit log is only interesting in
// aggregate, as a measure of how much ground you have covered.

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { OLabel } from "@/components/OLabel";
import { OChip } from "@/components/OChip";
import { usePlaceStore } from "@/lib/store/place-store";
import { computeExplorationStats, PlaceKind, type PlaceVisit } from "@/lib/types/place";

type Filter = "All" | "Roasteries" | "Cafés";

export function PlacesScreen() {
  const visits = usePlaceStore((s) => s.visits);
  const hydrated = usePlaceStore((s) => s.hydrated);
  const [filter, setFilter] = useState<Filter>("All");

  const stats = useMemo(() => computeExplorationStats(visits), [visits]);

  const shown = useMemo(() => {
    if (filter === "Roasteries")
      return visits.filter((v) => v.kind === PlaceKind.Roastery);
    if (filter === "Cafés")
      return visits.filter((v) => v.kind !== PlaceKind.Roastery);
    return visits;
  }, [visits, filter]);

  return (
    <main className="min-h-screen pb-[112px]">
      <header className="pt-[60px] pb-s4 px-s5 max-w-3xl mx-auto flex items-end justify-between gap-s4">
        <div className="flex flex-col gap-[2px]">
          <h1 className="font-display text-[36px] text-ink-1 leading-none">Places</h1>
          <span
            className="font-ui text-[10px] uppercase text-ink-3"
            style={{ letterSpacing: "0.1em" }}
          >
            Cups had, not bags bought
          </span>
        </div>
        <div className="flex items-center gap-s2 shrink-0">
          <Link
            href="/world"
            className="font-ui text-[11px] px-s3 py-[8px] rounded-r2 border text-ink-2"
            style={{ borderWidth: "0.5px", borderColor: "var(--line-2)" }}
          >
            World
          </Link>
          <Link
            href="/places/new"
            className="font-ui text-[11px] px-s4 py-[8px] rounded-r2"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Log a visit
          </Link>
        </div>
      </header>

      {visits.length > 0 && (
        <section className="max-w-3xl mx-auto px-s5 pb-s4">
          <div className="grid grid-cols-4 gap-s3">
            <Stat value={stats.places} label="Places" />
            <Stat value={stats.cities} label="Cities" />
            <Stat value={stats.countries} label="Countries" />
            <Stat
              value={stats.averageRating ?? "—"}
              label="Avg"
              mono={stats.averageRating !== null}
            />
          </div>

          {stats.countryList.length > 0 && (
            <div className="flex flex-wrap gap-s2 mt-s4">
              {stats.countryList.slice(0, 8).map((c) => (
                <OChip key={c.country} text={`${c.country} ${c.count}`} />
              ))}
            </div>
          )}

          {stats.best && (
            <p className="font-ui text-[11px] text-ink-4 mt-s3 leading-relaxed">
              Best cup so far: {stats.best.name}, {stats.best.city} at{" "}
              {stats.best.rating}.
              {stats.lastYear > 0
                ? ` ${stats.lastYear} ${stats.lastYear === 1 ? "visit" : "visits"} in the last year.`
                : ""}
            </p>
          )}
        </section>
      )}

      {visits.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <div className="flex px-s5">
            {(["All", "Roasteries", "Cafés"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="flex flex-col items-stretch"
              >
                <span
                  className={`font-ui text-[11px] uppercase px-s4 py-s3 ${
                    filter === f ? "text-ink-1 font-medium" : "text-ink-3"
                  }`}
                  style={{ letterSpacing: "0.1em" }}
                >
                  {f}
                </span>
                <div
                  className="h-[1.5px]"
                  style={{ background: filter === f ? "var(--accent)" : "transparent" }}
                />
              </button>
            ))}
          </div>
          <div className="h-[0.5px] bg-line-2" />
        </div>
      )}

      {hydrated && visits.length === 0 && <EmptyState />}

      <ul className="max-w-3xl mx-auto">
        {shown.map((v) => (
          <VisitRow key={v.id} visit={v} />
        ))}
      </ul>
    </main>
  );
}

function Stat({
  value,
  label,
  mono = true,
}: {
  value: number | string;
  label: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col items-start">
      <span
        className={`${mono ? "font-mono" : "font-ui"} text-[26px] text-ink-1 leading-none`}
      >
        {value}
      </span>
      <span
        className="font-ui text-[9px] uppercase text-ink-4 mt-[4px]"
        style={{ letterSpacing: "0.12em" }}
      >
        {label}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-3xl mx-auto px-s5 pt-s6 flex flex-col gap-s3">
      <p className="font-ui text-[14px] text-ink-2 leading-relaxed">
        Nothing logged yet. A visit is for the cup you had somewhere and did not
        bring home: the flat white at a roastery in Oslo, the filter at a café
        you found by accident.
      </p>
      <p className="font-ui text-[12px] text-ink-4 leading-relaxed">
        Over time this becomes the measure of how much you explore: places,
        cities and countries, alongside the bags in your library.
      </p>
      <Link
        href="/places/new"
        className="font-ui text-[13px] self-start px-s4 py-s3 rounded-r2"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
      >
        Log your first visit
      </Link>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function VisitRow({ visit }: { visit: PlaceVisit }) {
  const location = [visit.city, visit.country].filter(Boolean).join(", ");
  return (
    <li className="border-b border-line-1">
      <Link
        href={`/places/edit/${visit.id}`}
        className="flex items-start gap-s4 px-s5 py-s4 hover:bg-bg-1/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-s2 flex-wrap">
            <span className="font-display font-bold text-[19px] text-ink-1 leading-tight">
              {visit.name}
            </span>
            {visit.roasterName && <OLabel text="In directory" variant="accent" />}
          </div>
          <div
            className="font-ui text-[10px] uppercase text-ink-4 mt-1"
            style={{ letterSpacing: "0.12em" }}
          >
            {location}
            {location && " · "}
            {visit.kind}
            {" · "}
            {formatDate(visit.dateVisited)}
          </div>

          {visit.drink && (
            <p className="font-ui text-[13px] text-ink-2 mt-s2">{visit.drink}</p>
          )}

          {visit.flavorTags.length > 0 && (
            <div className="flex flex-wrap gap-s2 mt-s2">
              {visit.flavorTags.map((t) => (
                <OChip key={t} text={t.replace(/-/g, " ")} />
              ))}
            </div>
          )}

          {visit.notes && (
            <p className="font-ui text-[12px] text-ink-3 mt-s2 leading-snug">
              {visit.notes}
            </p>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end leading-none pt-[2px]">
          <span className="font-mono text-[24px] text-accent">{visit.rating}</span>
          <span className="font-mono text-[10px] text-ink-4 mt-[2px]">/ 100</span>
          {visit.wouldReturn && (
            <span
              className="font-ui text-[8px] uppercase text-ink-4 mt-[6px]"
              style={{ letterSpacing: "0.12em" }}
            >
              Return
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
