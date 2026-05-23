// Ported from Origin/Models/Models.swift
// Enums use the same display strings as the iOS app so pattern-matching across
// the two clients (if ever synced) stays consistent.

export const CoffeeProcess = {
  Washed: "Washed",
  Natural: "Natural",
  Honey: "Honey",
  Anaerobic: "Anaerobic",
  CarbonicMaceration: "Carbonic Maceration",
  WetHulled: "Wet Hulled",
  Other: "Other",
} as const;
export type CoffeeProcess = (typeof CoffeeProcess)[keyof typeof CoffeeProcess];
export const CoffeeProcessAll: CoffeeProcess[] = Object.values(CoffeeProcess);

export const RoastLevel = {
  Light: "Light",
  MediumLight: "Medium-Light",
  Medium: "Medium",
  MediumDark: "Medium-Dark",
  Dark: "Dark",
} as const;
export type RoastLevel = (typeof RoastLevel)[keyof typeof RoastLevel];
export const RoastLevelAll: RoastLevel[] = Object.values(RoastLevel);

export const BrewMethod = {
  Espresso: "Espresso",
  V60: "V60",
  AeroPress: "AeroPress",
  Chemex: "Chemex",
  FrenchPress: "French Press",
  MokaPot: "Moka Pot",
  ColdBrew: "Cold Brew",
  Other: "Other",
} as const;
export type BrewMethod = (typeof BrewMethod)[keyof typeof BrewMethod];
export const BrewMethodAll: BrewMethod[] = Object.values(BrewMethod);

export const BodyLevel = {
  Light: "Light",
  Medium: "Medium",
  Full: "Full",
} as const;
export type BodyLevel = (typeof BodyLevel)[keyof typeof BodyLevel];

export const AcidityLevel = {
  Low: "Low",
  Medium: "Medium",
  High: "High",
} as const;
export type AcidityLevel = (typeof AcidityLevel)[keyof typeof AcidityLevel];

// MARK: - CoffeeLog (the saved record — equivalent of SwiftData @Model)
export interface CoffeeLog {
  id: string;
  createdAt: string; // ISO date

  // Bag-level (AI-extracted from photo)
  roaster: string;
  coffeeName: string;
  originCountry: string;
  originRegion?: string;
  farmEstate?: string;
  altitudeMASL?: number;
  variety?: string;
  process: CoffeeProcess;
  roastLevel: RoastLevel;
  roastDate?: string; // ISO date
  roasterFlavorTags: string[];
  certifications: string[];

  // Personal log (filled by user)
  rating: number; // 0-100
  wouldSourceAgain: boolean;
  brewMethod: BrewMethod;
  userFlavorTags: string[];
  userTastingNotes: string;
  body?: BodyLevel;
  acidity?: AcidityLevel;
  dateConsumed: string; // ISO date
  sourcedFrom?: string;
  pricePaid?: number;
  currency?: string;
  bagPhotoDataUrl?: string; // base64 data URL of uploaded bag photo

  // Computed at scan time
  matchScore?: number;
  matchReason?: string;
}

export function allFlavorTags(log: CoffeeLog): string[] {
  return Array.from(new Set([...log.roasterFlavorTags, ...log.userFlavorTags]));
}

// MARK: - ScanResult (transient — from AI, before user saves)
export interface ScanResult {
  roaster: string;
  coffeeName: string;
  originCountry: string;
  originRegion: string;
  farmEstate: string;
  altitudeMASL: string;
  roastDateStr: string;
  variety: string;
  process: CoffeeProcess;
  roastLevel: RoastLevel;
  roasterFlavorTags: string[];
  certifications: string[];
  confidence: Record<string, number>;
  bagPhotoDataUrl?: string;
  matchScore?: number;
  matchReason?: string;
}

export function emptyScanResult(): ScanResult {
  return {
    roaster: "",
    coffeeName: "",
    originCountry: "",
    originRegion: "",
    farmEstate: "",
    altitudeMASL: "",
    roastDateStr: "",
    variety: "",
    process: CoffeeProcess.Other,
    roastLevel: RoastLevel.Medium,
    roasterFlavorTags: [],
    certifications: [],
    confidence: {},
  };
}

// Mirrors the date-parsing logic in ScanResult.toCoffeeLog
const ROAST_DATE_FORMATS = [
  /^(\d{4})-(\d{2})-(\d{2})$/, // 2026-04-15
  /^(\d{4})\/(\d{2})\/(\d{2})$/, // 2026/04/15
];
const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

export function parseRoastDate(input: string): string | undefined {
  const s = input.trim();
  if (!s) return undefined;
  for (const re of ROAST_DATE_FORMATS) {
    const m = s.match(re);
    if (m) {
      const [, y, mo, d] = m;
      const iso = new Date(Date.UTC(+y, +mo - 1, +d)).toISOString();
      return iso;
    }
  }
  // "dd MMM yyyy" e.g. "15 Apr 2026"
  const dMonY = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dMonY) {
    const day = +dMonY[1];
    const moIdx = MONTH_NAMES.indexOf(dMonY[2].slice(0, 3).toLowerCase());
    const year = +dMonY[3];
    if (moIdx >= 0) {
      return new Date(Date.UTC(year, moIdx, day)).toISOString();
    }
  }
  // "MMM yyyy" e.g. "April 2026"
  const monY = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monY) {
    const moIdx = MONTH_NAMES.indexOf(monY[1].slice(0, 3).toLowerCase());
    const year = +monY[2];
    if (moIdx >= 0) {
      return new Date(Date.UTC(year, moIdx, 1)).toISOString();
    }
  }
  return undefined;
}

export interface ScanResultToLogOptions {
  rating: number;
  wouldSourceAgain: boolean;
  brewMethod: BrewMethod;
  userFlavorTags: string[];
  userTastingNotes: string;
  body?: BodyLevel;
  acidity?: AcidityLevel;
  sourcedFrom?: string;
  dateConsumed?: string;
  bagPhotoDataUrl?: string;
}

export function scanResultToCoffeeLog(
  result: ScanResult,
  opts: ScanResultToLogOptions,
): CoffeeLog {
  const altitude = result.altitudeMASL.trim();
  const altitudeNum = altitude ? parseInt(altitude, 10) : NaN;
  const log: CoffeeLog = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),

    roaster: result.roaster,
    coffeeName: result.coffeeName,
    originCountry: result.originCountry,
    originRegion: result.originRegion || undefined,
    farmEstate: result.farmEstate || undefined,
    altitudeMASL: Number.isFinite(altitudeNum) ? altitudeNum : undefined,
    variety: result.variety || undefined,
    process: result.process,
    roastLevel: result.roastLevel,
    roastDate: parseRoastDate(result.roastDateStr),
    roasterFlavorTags: result.roasterFlavorTags,
    certifications: result.certifications,

    rating: opts.rating,
    wouldSourceAgain: opts.wouldSourceAgain,
    brewMethod: opts.brewMethod,
    userFlavorTags: opts.userFlavorTags,
    userTastingNotes: opts.userTastingNotes,
    body: opts.body,
    acidity: opts.acidity,
    dateConsumed: opts.dateConsumed ?? new Date().toISOString(),
    sourcedFrom: opts.sourcedFrom,
    bagPhotoDataUrl: opts.bagPhotoDataUrl ?? result.bagPhotoDataUrl,

    matchScore: result.matchScore,
    matchReason: result.matchReason,
  };
  return log;
}
