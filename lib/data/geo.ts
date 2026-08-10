// Geography helpers for the world view.
//
// Two coordinate sources:
//   * country centroids, generated from Natural Earth into world-geo.json
//   * a small hand-kept city table, for the "where you drank it" end of an arc
//
// Country names are the awkward part. Natural Earth says "United States of
// America" and "United Republic of Tanzania"; bags, people and the roaster
// directory say "United States" and "Tanzania". Everything resolves through
// `resolveCountry` so the rest of the app can keep using ordinary names.

import world from "./world-geo.json";

export interface WorldShape {
  n: string;
  /** Polygons -> rings -> points. Four levels deep: a country is a list of
   *  polygons, each of which is a list of rings (outer, then any holes),
   *  each of which is a list of [lon, lat] points. */
  p: number[][][][];
}

export const WORLD_SHAPES = world.shapes as unknown as WorldShape[];
const CENTROIDS = world.centroids as unknown as Record<string, [number, number]>;

/** App-facing name -> Natural Earth name. */
const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "United States of America",
  usa: "United States of America",
  us: "United States of America",
  "u.s.a.": "United States of America",
  america: "United States of America",
  tanzania: "United Republic of Tanzania",
  "ivory coast": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire",
  "democratic republic of the congo": "Dem. Rep. Congo",
  drc: "Dem. Rep. Congo",
  congo: "Dem. Rep. Congo",
  "republic of the congo": "Congo",
  "south korea": "South Korea",
  "north korea": "North Korea",
  laos: "Laos",
  vietnam: "Vietnam",
  "viet nam": "Vietnam",
  burma: "Myanmar",
  "czech republic": "Czechia",
  "bosnia and herzegovina": "Bosnia and Herz.",
  "dominican republic": "Dominican Rep.",
  "central african republic": "Central African Rep.",
  "equatorial guinea": "Eq. Guinea",
  "south sudan": "S. Sudan",
  "solomon islands": "Solomon Is.",
  "papua new guinea": "Papua New Guinea",
  "east timor": "Timor-Leste",
  "cape verde": "Cape Verde",
  "sao tome and principe": "São Tomé and Príncipe",
  uae: "United Arab Emirates",
  uk: "United Kingdom",
  england: "United Kingdom",
  britain: "United Kingdom",
  "great britain": "United Kingdom",
};

/** Resolve a free-text country name to the geometry's name, or null. */
export function resolveCountry(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (CENTROIDS[raw]) return raw;

  const key = raw.toLowerCase();
  const alias = COUNTRY_ALIASES[key];
  if (alias && CENTROIDS[alias]) return alias;

  // Case-insensitive exact match against the geometry's own names.
  for (const name of Object.keys(CENTROIDS)) {
    if (name.toLowerCase() === key) return name;
  }
  return null;
}

/** [lon, lat] for a country, or null when it cannot be resolved. */
export function countryPoint(input: string): [number, number] | null {
  const name = resolveCountry(input);
  return name ? CENTROIDS[name] ?? null : null;
}

/** A bag's origin field sometimes holds a blend: "Brazil, Colombia". Split it
 *  so each origin counts once, rather than creating a phantom country. */
export function splitOrigins(input: string): string[] {
  if (!input) return [];
  return input
    .split(/[,/&]|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Cities
//
// Hand-kept rather than geocoded: the set is small, it needs no network call
// at render time, and a wrong pin is worse than a missing one. Covers the
// roaster directory's cities plus the places worth drinking in. Unknown
// cities fall back to their country centroid.

const CITIES: Record<string, [number, number]> = {
  // India
  "new delhi": [77.2, 28.6],
  delhi: [77.2, 28.6],
  gurugram: [77.0, 28.5],
  noida: [77.4, 28.6],
  mumbai: [72.9, 19.1],
  pune: [73.9, 18.5],
  nagpur: [79.1, 21.1],
  bangalore: [77.6, 13.0],
  bengaluru: [77.6, 13.0],
  chennai: [80.3, 13.1],
  hyderabad: [78.5, 17.4],
  kolkata: [88.4, 22.6],
  chikmagalur: [75.8, 13.3],
  coorg: [75.7, 12.4],
  madikeri: [75.7, 12.4],
  jaipur: [75.8, 26.9],
  goa: [73.9, 15.3],
  siolim: [73.8, 15.6],
  shillong: [91.9, 25.6],
  kohima: [94.1, 25.7],
  chandigarh: [76.8, 30.7],
  ahmedabad: [72.6, 23.0],
  lucknow: [80.9, 26.8],
  bhopal: [77.4, 23.3],
  indore: [75.9, 22.7],
  kochi: [76.3, 10.0],
  "araku valley": [82.9, 18.3],
  visakhapatnam: [83.3, 17.7],
  lahti: [25.7, 61.0],
  // Nordics
  oslo: [10.7, 59.9],
  ålesund: [6.2, 62.5],
  alesund: [6.2, 62.5],
  bergen: [5.3, 60.4],
  helsinki: [25.0, 60.2],
  kirkkonummi: [24.4, 60.1],
  turku: [22.3, 60.5],
  tampere: [23.8, 61.5],
  stockholm: [18.1, 59.3],
  copenhagen: [12.6, 55.7],
  reykjavik: [-21.9, 64.1],
  // Africa
  "cape town": [18.4, -33.9],
  johannesburg: [28.0, -26.2],
  durban: [31.0, -29.9],
  pretoria: [28.2, -25.7],
  nairobi: [36.8, -1.3],
  "addis ababa": [38.7, 9.0],
  kigali: [30.1, -1.9],
  // Asia
  singapore: [103.8, 1.35],
  bangkok: [100.5, 13.8],
  "chiang mai": [98.98, 18.8],
  "chiang rai": [99.8, 19.9],
  "hong kong": [114.2, 22.3],
  tokyo: [139.7, 35.7],
  kyoto: [135.8, 35.0],
  seoul: [127.0, 37.6],
  shanghai: [121.5, 31.2],
  taipei: [121.6, 25.0],
  "kuala lumpur": [101.7, 3.1],
  jakarta: [106.8, -6.2],
  bali: [115.2, -8.4],
  colombo: [79.9, 6.9],
  dubai: [55.3, 25.2],
  doha: [51.5, 25.3],
  // Europe
  london: [-0.1, 51.5],
  paris: [2.35, 48.9],
  berlin: [13.4, 52.5],
  amsterdam: [4.9, 52.4],
  lisbon: [-9.1, 38.7],
  porto: [-8.6, 41.2],
  madrid: [-3.7, 40.4],
  barcelona: [2.2, 41.4],
  rome: [12.5, 41.9],
  milan: [9.2, 45.5],
  vienna: [16.4, 48.2],
  zurich: [8.5, 47.4],
  prague: [14.4, 50.1],
  budapest: [19.0, 47.5],
  warsaw: [21.0, 52.2],
  dublin: [-6.3, 53.3],
  edinburgh: [-3.2, 55.9],
  tallinn: [24.8, 59.4],
  // Americas
  "san francisco": [-122.4, 37.8],
  "santa cruz": [-122.0, 37.0],
  portland: [-122.7, 45.5],
  seattle: [-122.3, 47.6],
  "los angeles": [-118.2, 34.1],
  "new york": [-74.0, 40.7],
  chicago: [-87.6, 41.9],
  boston: [-71.1, 42.4],
  acton: [-71.4, 42.5],
  durham: [-78.9, 36.0],
  rogers: [-94.1, 36.3],
  austin: [-97.7, 30.3],
  denver: [-105.0, 39.7],
  toronto: [-79.4, 43.7],
  vancouver: [-123.1, 49.3],
  "mexico city": [-99.1, 19.4],
  bogota: [-74.1, 4.7],
  "bogotá": [-74.1, 4.7],
  medellin: [-75.6, 6.2],
  "medellín": [-75.6, 6.2],
  "sao paulo": [-46.6, -23.6],
  "são paulo": [-46.6, -23.6],
  "buenos aires": [-58.4, -34.6],
  lima: [-77.0, -12.0],
  // Oceania
  melbourne: [145.0, -37.8],
  sydney: [151.2, -33.9],
  auckland: [174.8, -36.9],
  wellington: [174.8, -41.3],
};

/** [lon, lat] for a city, falling back to the country centroid. Returns null
 *  when neither resolves, so the caller can skip the point rather than plot
 *  it at (0,0) in the Gulf of Guinea. */
export function cityPoint(
  city: string,
  country: string,
): [number, number] | null {
  const key = city.trim().toLowerCase();
  if (key && CITIES[key]) return CITIES[key];
  return countryPoint(country);
}

/** True when the city itself is known, as opposed to falling back to the
 *  country. Used to mark approximate pins in the UI. */
export function hasCityPoint(city: string): boolean {
  const key = city.trim().toLowerCase();
  return !!(key && CITIES[key]);
}
