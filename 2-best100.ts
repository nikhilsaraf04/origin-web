// Best 100 - data access for the bundled seed.
// Mirrors scripts/refresh_best100.py: the seed regenerates yearly and the
// shop `id` (normalized name) is the stable key local marks hang off.

import seed from "@/data/best100-seed.json";

export interface Best100Shop {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  /** edition key -> rank, e.g. { world: 2, europe: 1 } */
  editions: Record<string, number>;
  blurb: string;
}

interface Best100Seed {
  generated: string;
  source: string;
  editions: string[];
  shops: Best100Shop[];
}

export const best100Seed = seed as unknown as Best100Seed;
export const best100Shops: Best100Shop[] = best100Seed.shops;

export const EDITION_ORDER = ["world", "europe", "north", "south"] as const;
export type EditionKey = (typeof EDITION_ORDER)[number];

export const EDITION_LABELS: Record<string, string> = {
  world: "World",
  europe: "Europe",
  north: "N. America",
  south: "S. America",
};

export function editionLabel(key: string): string {
  return EDITION_LABELS[key] ?? key;
}

/** Best (lowest) rank across the shop's editions, world-first tiebreak. */
export function bestRank(shop: Best100Shop): number {
  const ranks = EDITION_ORDER.map((e) => shop.editions[e]).filter(
    (r): r is number => typeof r === "number",
  );
  return ranks.length ? Math.min(...ranks) : 999;
}

/** Rank shown in the list's rank column: the World rank when the shop is on
 * the World list, otherwise its best regional rank (matches approved mock). */
export function displayRank(shop: Best100Shop): number {
  return shop.editions.world ?? bestRank(shop);
}

/** Edition chips in display order. */
export function editionChips(shop: Best100Shop): { label: string; rank: number }[] {
  return EDITION_ORDER.filter((e) => shop.editions[e] != null).map((e) => ({
    label: editionLabel(e),
    rank: shop.editions[e],
  }));
}

export function placeLine(shop: Best100Shop): string {
  return [shop.city, shop.country].filter(Boolean).join(" · ");
}

export function findShop(id: string): Best100Shop | undefined {
  return best100Shops.find((s) => s.id === id);
}
