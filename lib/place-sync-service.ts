// PlaceSyncService — the /api/visits counterpart to sync-service.ts.
//
// Same strategy: local-first cache, last-write-wins by `updated_at`, pull then
// push on start/focus, single-row upsert on every local write, soft deletes
// pushed as tombstones. Separate cursors from the coffee-log sync so one
// falling behind never stalls the other.

"use client";

import { usePlaceStore } from "@/lib/store/place-store";
import type { PlaceVisit, PlaceKind } from "@/lib/types/place";

const LS_LAST_SYNC = "origin-web:places:lastSyncAt";
const LS_LAST_PUSH = "origin-web:places:lastPushAt";

/** Snake-case row shape as it lives in the backend DB. */
interface PlaceVisitRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  name: string;
  kind: string;
  city: string;
  country: string;
  roaster_name: string | null;
  date_visited: string;
  drink: string;
  origin_country: string | null;
  flavor_tags: string[];
  rating: number;
  would_return: boolean;
  notes: string;
  photo_url: string | null;
}

function rowToVisit(r: PlaceVisitRow): PlaceVisit {
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    name: r.name,
    kind: r.kind as PlaceKind,
    city: r.city,
    country: r.country,
    roasterName: r.roaster_name ?? undefined,
    dateVisited: r.date_visited,
    drink: r.drink ?? "",
    originCountry: r.origin_country ?? undefined,
    flavorTags: r.flavor_tags ?? [],
    rating: r.rating,
    wouldReturn: r.would_return,
    notes: r.notes ?? "",
    photoUrl: r.photo_url ?? undefined,
  };
}

/** `user_id` is set server-side from the token, so send a placeholder. The
 *  transient `photoDataUrl` is deliberately never sent: bytes stay out of the
 *  row, exactly as bag photos do. */
function visitToRow(v: PlaceVisit): PlaceVisitRow {
  return {
    id: v.id,
    user_id: "self",
    created_at: v.createdAt,
    updated_at: v.updatedAt ?? new Date().toISOString(),
    deleted_at: v.deletedAt ?? null,
    name: v.name,
    kind: v.kind,
    city: v.city,
    country: v.country,
    roaster_name: v.roasterName ?? null,
    date_visited: v.dateVisited,
    drink: v.drink ?? "",
    origin_country: v.originCountry ?? null,
    flavor_tags: v.flavorTags ?? [],
    rating: v.rating,
    would_return: v.wouldReturn,
    notes: v.notes ?? "",
    photo_url: v.photoUrl ?? null,
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

class PlaceSyncService {
  private started = false;
  private syncing = false;

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

  async syncOnce(): Promise<void> {
    if (this.syncing || typeof window === "undefined") return;
    this.syncing = true;
    try {
      const authed = await this.pull();
      if (authed) await this.push();
    } catch (err) {
      console.warn("[places sync] failed:", err);
    } finally {
      this.syncing = false;
    }
  }

  private async pull(): Promise<boolean> {
    const since = lsGet(LS_LAST_SYNC) ?? "1970-01-01T00:00:00.000Z";
    const res = await fetch(`/api/visits?since=${encodeURIComponent(since)}`, {
      credentials: "same-origin",
    });
    if (res.status === 401) return false;
    if (!res.ok) throw new Error(`pull ${res.status}`);
    const body = (await res.json()) as { visits: PlaceVisitRow[] };
    const rows = body.visits ?? [];
    if (rows.length === 0) return true;

    usePlaceStore.getState().setAllFromRemote(rows.map(rowToVisit));

    const maxUpdated = rows.reduce(
      (acc, r) => (r.updated_at > acc ? r.updated_at : acc),
      since,
    );
    lsSet(LS_LAST_SYNC, maxUpdated);
    return true;
  }

  private async push(): Promise<void> {
    const since = lsGet(LS_LAST_PUSH) ?? "1970-01-01T00:00:00.000Z";
    const sinceMs = Date.parse(since);
    const all = usePlaceStore.getState().allVisits;
    const dirty = all.filter((v) => {
      const t = v.updatedAt ? Date.parse(v.updatedAt) : 0;
      return t > sinceMs;
    });
    if (dirty.length === 0) return;

    const res = await fetch(`/api/visits`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visits: dirty.map(visitToRow) }),
    });
    if (res.status === 401) return;
    if (!res.ok) throw new Error(`push ${res.status}`);

    lsSet(LS_LAST_PUSH, new Date().toISOString());
  }

  async upsertOne(visit: PlaceVisit): Promise<void> {
    if (typeof window === "undefined") return;
    const res = await fetch(`/api/visits`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visits: [visitToRow(visit)] }),
    });
    if (res.status === 401) return; // signed out — next sign-in push catches up
    if (!res.ok) throw new Error(`upsertOne ${res.status}`);
    lsSet(LS_LAST_PUSH, new Date().toISOString());
  }

  resetCursors(): void {
    try {
      localStorage.removeItem(LS_LAST_SYNC);
      localStorage.removeItem(LS_LAST_PUSH);
    } catch {
      /* ignore */
    }
  }
}

export const placeSyncService = new PlaceSyncService();
