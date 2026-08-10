// World — the passport view. What the library and the visit log look like
// laid over a map, plus the counts that make it feel like progress.

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { OLabel } from "@/components/OLabel";
import {
  WorldMap,
  type ArcDatum,
  type OriginDatum,
  type PlaceDatum,
} from "@/components/WorldMap";
import { useCoffeeStore } from "@/lib/store/coffee-store";
import { usePlaceStore } from "@/lib/store/place-store";
import { countryPoint, cityPoint, hasCityPoint, splitOrigins } from "@/lib/data/geo";
import { COFFEE_PRODUCERS } from "@/lib/data/producers";

export function WorldScreen() {
  const logs = useCoffeeStore((s) => s.logs);
  const visits = usePlaceStore((s) => s.visits);

  // --- Origins, from bags and from any visit that recorded a bean origin.
  const { origins, unmapped, blankOrigins } = useMemo(() => {
    const acc = new Map<string, { count: number; ratings: number[] }>();
    let blank = 0;
    const unresolved = new Set<string>();

    const add = (raw: string, rating?: number) => {
      const parts = splitOrigins(raw);
      if (parts.length === 0) {
        blank++;
        return;
      }
      for (const part of parts) {
        if (!countryPoint(part)) {
          unresolved.add(part);
          continue;
        }
        const entry = acc.get(part) ?? { count: 0, ratings: [] };
        entry.count += 1;
        if (typeof rating === "number" && rating > 0) entry.ratings.push(rating);
        acc.set(part, entry);
      }
    };

    for (const l of logs) add(l.originCountry ?? "", l.rating);
    for (const v of visits) if (v.originCountry) add(v.originCountry, v.rating);

    const list: OriginDatum[] = [];
    for (const [country, { count, ratings }] of acc) {
      const point = countryPoint(country);
      if (!point) continue;
      list.push({
        country,
        point,
        count,
        rating: ratings.length
          ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
          : null,
      });
    }
    list.sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
    return {
      origins: list,
      unmapped: Array.from(unresolved),
      blankOrigins: blank,
    };
  }, [logs, visits]);

  // --- Places drunk in, from visits.
  const places = useMemo(() => {
    const acc = new Map<string, PlaceDatum>();
    for (const v of visits) {
      const point = cityPoint(v.city, v.country);
      if (!point) continue;
      const key = `${v.city.toLowerCase()}|${v.country.toLowerCase()}`;
      const existing = acc.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        acc.set(key, {
          key,
          label: [v.city, v.country].filter(Boolean).join(", "),
          point,
          count: 1,
          approximate: !hasCityPoint(v.city),
        });
      }
    }
    return Array.from(acc.values());
  }, [visits]);

  // --- Arcs need both ends, so only visits that recorded a bean origin.
  const arcs = useMemo(() => {
    const out: ArcDatum[] = [];
    const seen = new Set<string>();
    for (const v of visits) {
      if (!v.originCountry) continue;
      const to = cityPoint(v.city, v.country);
      if (!to) continue;
      for (const part of splitOrigins(v.originCountry)) {
        const from = countryPoint(part);
        if (!from) continue;
        const key = `${part}->${v.city}|${v.country}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ key, from, to });
      }
    }
    return out;
  }, [visits]);

  const producerTotal = COFFEE_PRODUCERS.length;
  const producersTasted = origins.filter((o) =>
    COFFEE_PRODUCERS.some((p) => p.toLowerCase() === o.country.toLowerCase()),
  ).length;

  const countriesDrunkIn = new Set(
    visits.map((v) => v.country.trim().toLowerCase()).filter(Boolean),
  ).size;

  return (
    <main className="min-h-screen pb-[112px]">
      <header className="pt-[60px] pb-s4 px-s5 max-w-3xl mx-auto">
        <h1 className="font-display text-[36px] text-ink-1 leading-none">World</h1>
        <span
          className="font-ui text-[10px] uppercase text-ink-3"
          style={{ letterSpacing: "0.1em" }}
        >
          Where it grew, where you drank it
        </span>
      </header>

      <section className="max-w-3xl mx-auto px-s3">
        <div className="rounded-r4 overflow-hidden border border-line-2">
          <WorldMap origins={origins} places={places} arcs={arcs} />
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-s5 pt-s5">
        <div className="grid grid-cols-4 gap-s3">
          <Stat value={origins.length} label="Origins" />
          <Stat value={`${producersTasted}/${producerTotal}`} label="Producers" />
          <Stat value={countriesDrunkIn} label="Drunk in" />
          <Stat value={places.length} label="Cities" />
        </div>
      </section>

      {origins.length > 0 && (
        <section className="max-w-3xl mx-auto px-s5 pt-s5">
          <OLabel text="Origins by count" />
          <ul className="mt-s3 flex flex-col">
            {origins.map((o) => (
              <li
                key={o.country}
                className="flex items-center gap-s3 py-s2 border-b border-line-1"
              >
                <span className="font-ui text-[13px] text-ink-1 flex-1 min-w-0 truncate">
                  {o.country}
                </span>
                <div className="flex-1 max-w-[140px] h-[3px] rounded-pill bg-line-1 overflow-hidden">
                  <div
                    className="h-full rounded-pill"
                    style={{
                      width: `${(o.count / origins[0].count) * 100}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>
                <span className="font-mono text-[12px] text-ink-2 w-[24px] text-right">
                  {o.count}
                </span>
                <span className="font-mono text-[12px] text-ink-4 w-[34px] text-right">
                  {o.rating ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="max-w-3xl mx-auto px-s5 pt-s6 flex flex-col gap-s2">
        <p className="font-ui text-[11px] text-ink-4 leading-relaxed">
          Filled points are origins, sized by how many coffees you have had from
          them. Ringed points are places you drank in. An arc runs from an
          origin to the city you drank it in.
        </p>
        {arcs.length === 0 && (
          <p className="font-ui text-[11px] text-ink-4 leading-relaxed">
            No arcs yet. A bag records where the coffee grew but not where you
            drank it, so only{" "}
            <Link href="/places" className="text-accent">
              logged visits
            </Link>{" "}
            can draw the second half of the line. Add a visit with a bean origin
            and it appears here.
          </p>
        )}
        {(blankOrigins > 0 || unmapped.length > 0) && (
          <p className="font-ui text-[11px] text-ink-4 leading-relaxed">
            {blankOrigins > 0 &&
              `${blankOrigins} ${blankOrigins === 1 ? "coffee has" : "coffees have"} no origin recorded, so ${blankOrigins === 1 ? "it is" : "they are"} not on the map. `}
            {unmapped.length > 0 &&
              `Could not place: ${unmapped.join(", ")}.`}
          </p>
        )}
        <p className="font-ui text-[11px] text-ink-4 leading-relaxed">
          Dashed rings are approximate: the city was not in the coordinate
          table, so the pin sits at the country instead. The producer count is
          against a curated list of {producerTotal} coffee-growing countries,
          not an official register.
        </p>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="font-mono text-[26px] text-ink-1 leading-none">{value}</span>
      <span
        className="font-ui text-[9px] uppercase text-ink-4 mt-[4px]"
        style={{ letterSpacing: "0.12em" }}
      >
        {label}
      </span>
    </div>
  );
}
