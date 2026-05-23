// Ported from Origin/Models/Models.swift — TasteProfile struct + compute logic
import {
  type CoffeeLog,
  allFlavorTags,
} from "@/lib/types/models";

export interface RankedItem {
  id: string;
  label: string;
  avgRating: number; // 0-100
  count: number;
  normalizedScore: number; // 0-1
}

export interface TasteProfile {
  topProcesses: RankedItem[];
  topOrigins: RankedItem[];
  topRegions: RankedItem[];
  topRoastLevels: RankedItem[];
  topVarieties: RankedItem[];
  topFlavorTags: RankedItem[];
  topBrewMethods: RankedItem[];

  totalLogged: number;
  totalCountries: number;
  totalRoasters: number;
  avgRating: number;
}

export const TasteProfileMinLogs = 5;

export function isProfileReady(p: TasteProfile | null | undefined): p is TasteProfile {
  return !!p && p.totalLogged >= TasteProfileMinLogs;
}

function rankBy<K extends string>(
  logs: CoffeeLog[],
  pick: (log: CoffeeLog) => K | undefined | null,
): RankedItem[] {
  const buckets = new Map<K, { sum: number; count: number }>();
  for (const log of logs) {
    const key = pick(log);
    if (key === undefined || key === null || key === "") continue;
    const cur = buckets.get(key as K) ?? { sum: 0, count: 0 };
    cur.sum += log.rating;
    cur.count += 1;
    buckets.set(key as K, cur);
  }
  let items: RankedItem[] = Array.from(buckets.entries()).map(([label, v]) => ({
    id: `${label}`,
    label: `${label}`,
    avgRating: v.sum / Math.max(v.count, 1),
    count: v.count,
    normalizedScore: 0,
  }));
  items.sort((a, b) => b.avgRating - a.avgRating);
  const max = items[0]?.avgRating ?? 1;
  items = items.map((item) => ({
    ...item,
    normalizedScore: max > 0 ? item.avgRating / max : 0,
  }));
  return items;
}

export function computeTasteProfile(logs: CoffeeLog[]): TasteProfile {
  const topProcesses = rankBy(logs, (l) => l.process);
  const topOrigins = rankBy(logs, (l) => l.originCountry);
  const topRegions = rankBy(logs, (l) => l.originRegion);
  const topRoastLevels = rankBy(logs, (l) => l.roastLevel);
  const topVarieties = rankBy(logs, (l) => l.variety);
  const topBrewMethods = rankBy(logs, (l) => l.brewMethod);

  // Flavor tags: union of roaster + user tags per log, weighted by rating
  const tagBuckets = new Map<string, { sum: number; count: number }>();
  for (const log of logs) {
    for (const tag of allFlavorTags(log)) {
      const cur = tagBuckets.get(tag) ?? { sum: 0, count: 0 };
      cur.sum += log.rating;
      cur.count += 1;
      tagBuckets.set(tag, cur);
    }
  }
  let topFlavorTags: RankedItem[] = Array.from(tagBuckets.entries()).map(
    ([label, v]) => ({
      id: label,
      label,
      avgRating: v.sum / Math.max(v.count, 1),
      count: v.count,
      normalizedScore: 0,
    }),
  );
  topFlavorTags.sort((a, b) => b.avgRating - a.avgRating);
  const maxFlavor = topFlavorTags[0]?.avgRating ?? 1;
  topFlavorTags = topFlavorTags.map((item) => ({
    ...item,
    normalizedScore: maxFlavor > 0 ? item.avgRating / maxFlavor : 0,
  }));
  topFlavorTags = topFlavorTags.slice(0, 20);

  const totalLogged = logs.length;
  const avgRating =
    totalLogged === 0
      ? 0
      : logs.reduce((acc, l) => acc + l.rating, 0) / totalLogged;

  return {
    topProcesses,
    topOrigins,
    topRegions,
    topRoastLevels,
    topVarieties,
    topFlavorTags,
    topBrewMethods,
    totalLogged,
    totalCountries: new Set(logs.map((l) => l.originCountry)).size,
    totalRoasters: new Set(logs.map((l) => l.roaster)).size,
    avgRating,
  };
}
