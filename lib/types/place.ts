// PlaceVisit — a cup had somewhere, as opposed to a bag brought home.
//
// Deliberately a SEPARATE entity from CoffeeLog rather than a `kind` flag on
// it. The two barely overlap: a bag has a roast date, altitude, variety and
// process; a visit has a room, a city, a person behind the bar and a date you
// were there. Forcing them into one row would leave most columns null on both
// sides and make the taste-profile maths read records it should ignore.
//
// What they share is the 0-100 rating scale and the canonical flavor
// taxonomy, so visits can feed the same exploration and map views.

export const PlaceKind = {
  Roastery: "Roastery",
  Cafe: "Café",
  Bar: "Coffee bar",
  Other: "Other",
} as const;
export type PlaceKind = (typeof PlaceKind)[keyof typeof PlaceKind];
export const PlaceKindAll: PlaceKind[] = Object.values(PlaceKind);

export interface PlaceVisit {
  id: string;
  createdAt: string;
  /** Bumped on every local write; drives last-write-wins in sync. */
  updatedAt?: string;
  /** Soft delete — tombstones stay in the cache so sync can push them. */
  deletedAt?: string | null;

  // The place
  name: string;
  kind: PlaceKind;
  city: string;
  country: string;
  /** Exact directory entry name when this place is a roaster we already list,
   *  so a visit can mark that roaster tasted. Empty for cafés that only serve
   *  other people's coffee. */
  roasterName?: string;

  // The cup
  dateVisited: string; // ISO
  /** What was ordered, free-ish text ("Cortado", "V60, Ethiopia"). */
  drink: string;
  /** Bean origin where known, so the visit can draw an arc on the map. */
  originCountry?: string;
  flavorTags: string[];

  // The verdict
  rating: number; // 0-100, same scale as bags
  wouldReturn: boolean;
  notes: string;

  photoUrl?: string;
  /** Transient local preview only, dropped once uploaded. */
  photoDataUrl?: string;
}

export function emptyPlaceVisit(): PlaceVisit {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    name: "",
    kind: PlaceKind.Roastery,
    city: "",
    country: "",
    dateVisited: now,
    drink: "",
    flavorTags: [],
    rating: 75,
    wouldReturn: true,
    notes: "",
  };
}

// MARK: - Exploration stats

export interface ExplorationStats {
  places: number;
  cities: number;
  countries: number;
  roasteries: number;
  /** Distinct countries, most-visited first. */
  countryList: { country: string; count: number }[];
  /** Distinct cities, most-visited first. */
  cityList: { city: string; country: string; count: number }[];
  /** Mean rating across rated visits, or null when there are none. */
  averageRating: number | null;
  /** Highest-rated visit, for a "best cup" callout. */
  best: PlaceVisit | null;
  /** Visits in the trailing 365 days. */
  lastYear: number;
}

export function computeExplorationStats(visits: PlaceVisit[]): ExplorationStats {
  const live = visits.filter((v) => !v.deletedAt);

  const countryCounts = new Map<string, number>();
  const cityCounts = new Map<string, { city: string; country: string; count: number }>();

  for (const v of live) {
    const country = v.country.trim();
    if (country) countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);

    const city = v.city.trim();
    if (city) {
      // Key on city+country: there is more than one Cambridge.
      const key = `${city.toLowerCase()}|${country.toLowerCase()}`;
      const prev = cityCounts.get(key);
      if (prev) prev.count += 1;
      else cityCounts.set(key, { city, country, count: 1 });
    }
  }

  const rated = live.filter((v) => v.rating > 0);
  const averageRating = rated.length
    ? Math.round(rated.reduce((a, v) => a + v.rating, 0) / rated.length)
    : null;

  const best = rated.length
    ? rated.reduce((a, v) => (v.rating > a.rating ? v : a), rated[0])
    : null;

  const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const lastYear = live.filter((v) => {
    const t = Date.parse(v.dateVisited);
    return Number.isFinite(t) && t >= yearAgo;
  }).length;

  return {
    places: live.length,
    cities: cityCounts.size,
    countries: countryCounts.size,
    roasteries: live.filter((v) => v.kind === PlaceKind.Roastery).length,
    countryList: Array.from(countryCounts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country)),
    cityList: Array.from(cityCounts.values()).sort(
      (a, b) => b.count - a.count || a.city.localeCompare(b.city),
    ),
    averageRating,
    best,
    lastYear,
  };
}
