// SyncService — REST ↔ Zustand glue. Talks to our own Fly backend
// (/api/logs) instead of Supabase. Auth is cookie-based on web, so fetch
// calls just need `credentials: "same-origin"`.
//
// Strategy is unchanged from the Supabase version: local-first cache,
// last-write-wins by `updated_at`.
//   * On start / focus: pull rows newer than lastSyncAt, merge by LWW,
//     then push local rows newer than lastPushAt.
//   * On every local write: fire async upsert of the single row.
//   * Deletes are soft: `deletedAt` set, tombstone pushed, reads filter it.
//
// `bag_photo_url` is intentionally skipped — bag photos stay local-only.

"use client";

import { useCoffeeStore } from "@/lib/store/coffee-store";
import type {
  CoffeeLog,
  CoffeeProcess,
  RoastLevel,
  BrewMethod,
  BodyLevel,
  AcidityLevel,
} from "@/lib/types/models";

const LS_LAST_SYNC = "origin-web:sync:lastSyncAt";
const LS_LAST_PUSH = "origin-web:sync:lastPushAt";

/** Snake-case row shape as it lives in the backend DB. */
interface CoffeeLogRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  roaster: string;
  coffee_name: string;
  origin_country: string;
  origin_region: string | null;
  farm_estate: string | null;
  variety: string | null;
  altitude_masl: number | null;
  process: string;
  roast_level: string;
  brew_method: string;
  roast_date: string | null;
  roaster_flavor_tags: string[];
  certifications: string[];
  user_flavor_tags: string[];
  rating: number;
  would_source_again: boolean;
  user_tasting_notes: string;
  body: string | null;
  acidity: string | null;
  date_consumed: string;
  sourced_from: string | null;
  currency: string | null;
  bag_photo_url: string | null;
  price_paid: number | null;
  match_score: number | null;
  match_reason: string | null;
}

function rowToLog(r: CoffeeLogRow): CoffeeLog {
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    roaster: r.roaster,
    coffeeName: r.coffee_name,
    originCountry: r.origin_country,
    originRegion: r.origin_region ?? undefined,
    farmEstate: r.farm_estate ?? undefined,
    altitudeMASL: r.altitude_masl ?? undefined,
    variety: r.variety ?? undefined,
    process: r.process as CoffeeProcess,
    roastLevel: r.roast_level as RoastLevel,
    roastDate: r.roast_date ?? undefined,
    roasterFlavorTags: r.roaster_flavor_tags ?? [],
    certifications: r.certifications ?? [],
    rating: r.rating,
    wouldSourceAgain: r.would_source_again,
    brewMethod: r.brew_method as BrewMethod,
    userFlavorTags: r.user_flavor_tags ?? [],
    userTastingNotes: r.user_tasting_notes ?? "",
    body: (r.body as BodyLevel | null) ?? undefined,
    acidity: (r.acidity as AcidityLevel | null) ?? undefined,
    dateConsumed: r.date_consumed,
    sourcedFrom: r.sourced_from ?? undefined,
    pricePaid: r.price_paid ?? undefined,
    currency: r.currency ?? undefined,
    // bag_photo_url intentionally not hydrated — stays local.
    matchScore: r.match_score ?? undefined,
    matchReason: r.match_reason ?? undefined,
  };
}

/** Build the row payload for an upsert. `user_id` is set server-side from
 *  the token, so we send a placeholder the backend overwrites. */
function logToRow(log: CoffeeLog): Omit<CoffeeLogRow, "bag_photo_url"> {
  const updated = log.updatedAt ?? new Date().toISOString();
  return {
    id: log.id,
    user_id: "self",
    created_at: log.createdAt,
    updated_at: updated,
    deleted_at: log.deletedAt ?? null,
    roaster: log.roaster,
    coffee_name: log.coffeeName,
    origin_country: log.originCountry,
    origin_region: log.originRegion ?? null,
    farm_estate: log.farmEstate ?? null,
    variety: log.variety ?? null,
    altitude_masl: log.altitudeMASL ?? null,
    process: log.process,
    roast_level: log.roastLevel,
    brew_method: log.brewMethod,
    roast_date: log.roastDate ?? null,
    roaster_flavor_tags: log.roasterFlavorTags ?? [],
    certifications: log.certifications ?? [],
    user_flavor_tags: log.userFlavorTags ?? [],
    rating: log.rating,
    would_source_again: log.wouldSourceAgain,
    user_tasting_notes: log.userTastingNotes ?? "",
    body: log.body ?? null,
    acidity: log.acidity ?? null,
    date_consumed: log.dateConsumed,
    sourced_from: log.sourcedFrom ?? null,
    currency: log.currency ?? null,
    price_paid: log.pricePaid ?? null,
    match_score: log.matchScore ?? null,
    match_reason: log.matchReason ?? null,
  };
}

function lsGet(key: string): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
  } catch {
    /* private mode, quota — ignore */
  }
}

class SyncService {
  private started = false;
  private syncing = false;

  /** Wire up focus listeners. Idempotent. Auth is a cookie, so there's no
   *  auth-state subscription to manage — pull/push simply 401 when signed
   *  out and we swallow it. */
  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;

    void Promise.resolve().then(() => this.syncOnce());

    window.addEventListener("focus", () => {
      void this.syncOnce();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void this.syncOnce();
    });
  }

  /** Pull-then-push. Guards against re-entry. */
  async syncOnce(): Promise<void> {
    if (this.syncing || typeof window === "undefined") return;
    this.syncing = true;
    try {
      const authed = await this.pull();
      if (authed) await this.push();
    } catch (err) {
      console.warn("[sync] failed:", err);
    } finally {
      this.syncing = false;
    }
  }

  /** Pull rows newer than lastSyncAt and merge into the store.
   *  Returns false if unauthenticated (so the caller skips push). */
  private async pull(): Promise<boolean> {
    const since = lsGet(LS_LAST_SYNC) ?? "1970-01-01T00:00:00.000Z";
    const res = await fetch(`/api/logs?since=${encodeURIComponent(since)}`, {
      credentials: "same-origin",
    });
    if (res.status === 401) return false;
    if (!res.ok) throw new Error(`pull ${res.status}`);
    const body = (await res.json()) as { logs: CoffeeLogRow[] };
    const rows = body.logs ?? [];
    if (rows.length === 0) return true;

    useCoffeeStore.getState().setAllFromRemote(rows.map(rowToLog));

    const maxUpdated = rows.reduce(
      (acc, r) => (r.updated_at > acc ? r.updated_at : acc),
      since,
    );
    lsSet(LS_LAST_SYNC, maxUpdated);
    return true;
  }

  /** Push every local row whose updatedAt > lastPushAt (includes
   *  tombstones — soft deletes propagate this way). */
  private async push(): Promise<void> {
    const since = lsGet(LS_LAST_PUSH) ?? "1970-01-01T00:00:00.000Z";
    const sinceMs = Date.parse(since);
    const all = useCoffeeStore.getState().allLogs;
    const dirty = all.filter((l) => {
      const t = l.updatedAt ? Date.parse(l.updatedAt) : 0;
      return t > sinceMs;
    });
    if (dirty.length === 0) return;

    const res = await fetch(`/api/logs`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ logs: dirty.map(logToRow) }),
    });
    if (res.status === 401) return;
    if (!res.ok) throw new Error(`push ${res.status}`);

    lsSet(LS_LAST_PUSH, new Date().toISOString());
  }

  /** Fire-and-forget upsert of a single row on every local write. */
  async upsertOne(log: CoffeeLog): Promise<void> {
    if (typeof window === "undefined") return;
    const res = await fetch(`/api/logs`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ logs: [logToRow(log)] }),
    });
    if (res.status === 401) return; // signed out — next sign-in push catches up
    if (!res.ok) throw new Error(`upsertOne ${res.status}`);
    lsSet(LS_LAST_PUSH, new Date().toISOString());
  }

  /** Reset sync cursors (called on sign-out). */
  resetCursors(): void {
    try {
      localStorage.removeItem(LS_LAST_SYNC);
      localStorage.removeItem(LS_LAST_PUSH);
    } catch {
      /* ignore */
    }
  }
}

export const syncService = new SyncService();
