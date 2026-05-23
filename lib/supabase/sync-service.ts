// SyncService — Supabase ↔ Zustand glue.
//
// Strategy: local-first cache, last-write-wins by `updated_at`.
//   * On start / sign-in / window-focus: pull rows newer than lastSyncAt,
//     merge by LWW, then push local rows newer than lastPushAt.
//   * On every local write: fire async upsert (via the store's
//     `fireUpsert` hook). Failures are silent — the next focus pass will
//     pick them up since `updated_at > lastPushAt`.
//   * Deletes are soft: `deletedAt` is set, the tombstone is pushed, and
//     reads filter `deletedAt != null`.
//
// `bag_photo_url` is intentionally skipped — bag photos stay local-only
// in v1 (data-URLs in localStorage). Cross-device photo sync is a v2
// follow-up that needs Supabase Storage + image compression.

"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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
const TABLE = "coffee_logs";

/** Snake-case row shape as it lives in Postgres. */
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
    // bag_photo_url intentionally not hydrated — v2.
    matchScore: r.match_score ?? undefined,
    matchReason: r.match_reason ?? undefined,
  };
}

/** Build the row payload for an upsert. `user_id` is filled in by the
 *  caller because we only know it after auth. */
function logToRow(
  log: CoffeeLog,
  userId: string,
): Omit<CoffeeLogRow, "bag_photo_url"> {
  const updated = log.updatedAt ?? new Date().toISOString();
  return {
    id: log.id,
    user_id: userId,
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
  private client: SupabaseClient | null = null;
  private cachedUserId: string | null = null;

  private get supabase(): SupabaseClient {
    if (!this.client) this.client = getSupabaseBrowserClient();
    return this.client;
  }

  /** Resolve the current auth user id, or null if signed out. Cached for
   *  the session lifetime — invalidated when auth state changes. */
  private async userId(): Promise<string | null> {
    if (this.cachedUserId) return this.cachedUserId;
    const { data } = await this.supabase.auth.getUser();
    const id = data.user?.id ?? null;
    this.cachedUserId = id;
    return id;
  }

  /** Wire up auth + focus listeners. Idempotent. */
  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;

    // Initial sync on next tick so the caller can finish mounting.
    void Promise.resolve().then(() => this.syncOnce());

    window.addEventListener("focus", () => {
      void this.syncOnce();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void this.syncOnce();
    });

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.cachedUserId = session?.user?.id ?? null;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void this.syncOnce();
      } else if (event === "SIGNED_OUT") {
        // Forget cursors so the next sign-in does a fresh pull. Don't nuke
        // local logs — the user may sign back into the same account.
        try {
          localStorage.removeItem(LS_LAST_SYNC);
          localStorage.removeItem(LS_LAST_PUSH);
        } catch {
          /* ignore */
        }
      }
    });
  }

  /** Pull-then-push. Guards against re-entry. */
  async syncOnce(): Promise<void> {
    if (this.syncing) return;
    const uid = await this.userId();
    if (!uid) return;
    this.syncing = true;
    try {
      await this.pull(uid);
      await this.push(uid);
    } catch (err) {
      // Log but don't throw — sync is best-effort.
      console.warn("[sync] failed:", err);
    } finally {
      this.syncing = false;
    }
  }

  /** Pull rows newer than lastSyncAt and merge into the store. */
  private async pull(uid: string): Promise<void> {
    const since = lsGet(LS_LAST_SYNC) ?? "1970-01-01T00:00:00.000Z";
    const { data, error } = await this.supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", uid)
      .gt("updated_at", since)
      .order("updated_at", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as CoffeeLogRow[];
    if (rows.length === 0) return;

    const logs = rows.map(rowToLog);
    useCoffeeStore.getState().setAllFromRemote(logs);

    const maxUpdated = rows.reduce(
      (acc, r) => (r.updated_at > acc ? r.updated_at : acc),
      since,
    );
    lsSet(LS_LAST_SYNC, maxUpdated);
  }

  /** Push every local row whose updatedAt > lastPushAt (includes
   *  tombstones — soft deletes get propagated this way). */
  private async push(uid: string): Promise<void> {
    const since = lsGet(LS_LAST_PUSH) ?? "1970-01-01T00:00:00.000Z";
    const sinceMs = Date.parse(since);
    // Use allLogs (includes tombstones), not the live `logs` selector.
    const all = useCoffeeStore.getState().allLogs;
    const dirty = all.filter((l) => {
      const t = l.updatedAt ? Date.parse(l.updatedAt) : 0;
      return t > sinceMs;
    });
    if (dirty.length === 0) return;

    const rows = dirty.map((l) => logToRow(l, uid));
    const { error } = await this.supabase
      .from(TABLE)
      .upsert(rows, { onConflict: "id" });
    if (error) throw error;

    lsSet(LS_LAST_PUSH, new Date().toISOString());
  }

  /** Fire-and-forget upsert of a single row. Called from the store on
   *  every local write so the user sees their changes propagate without
   *  waiting for the next focus pass. */
  async upsertOne(log: CoffeeLog): Promise<void> {
    const uid = await this.userId();
    if (!uid) return; // signed out — next sign-in will catch up via push()
    const row = logToRow(log, uid);
    const { error } = await this.supabase
      .from(TABLE)
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    // Advance the push cursor so the next push() doesn't re-send this row.
    lsSet(LS_LAST_PUSH, new Date().toISOString());
  }

  /** Reset auth-derived caches. Call after sign-out if you want to fully
   *  reset (most callers don't need this). */
  reset(): void {
    this.cachedUserId = null;
  }
}

export const syncService = new SyncService();
