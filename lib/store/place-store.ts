// Zustand store for place visits. Mirrors coffee-store.ts deliberately:
// local-first cache, soft deletes, last-write-wins merge from the server, and
// a fire-and-forget upsert on every write. Kept as a separate store (and a
// separate table) because a visit and a bag are different records.

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PlaceVisit } from "@/lib/types/place";

interface PlaceStoreState {
  /** Every visit known to the client, INCLUDING tombstones. */
  allVisits: PlaceVisit[];
  /** Live (non-deleted) visits — what the UI reads. */
  visits: PlaceVisit[];
  hydrated: boolean;

  getVisit: (id: string) => PlaceVisit | undefined;

  save: (visit: PlaceVisit) => void;
  update: (id: string, patch: Partial<PlaceVisit>) => void;
  remove: (id: string) => void;
  reset: () => void;

  setAllFromRemote: (rows: PlaceVisit[]) => void;
}

/** Keep the primary `kind` and the `kinds` array consistent, tolerating
 *  visits that only have one of the two (rows from older builds). */
function normalizeKinds(v: PlaceVisit): PlaceVisit {
  const kinds = v.kinds && v.kinds.length > 0 ? v.kinds : [v.kind];
  return { ...v, kinds, kind: kinds[0] };
}

function isAlive(v: PlaceVisit): boolean {
  return !v.deletedAt;
}

function deriveLive(all: PlaceVisit[]): PlaceVisit[] {
  return all.filter(isAlive);
}

function tsOf(v: PlaceVisit): number {
  const t = v.updatedAt ?? v.createdAt;
  const n = t ? Date.parse(t) : NaN;
  return Number.isFinite(n) ? n : 0;
}

/** Newest visit first, by the date you were there rather than by write time:
 *  this list is a travel history, so a visit backdated to last year belongs
 *  below one from last week even if it was typed in later. */
function byVisitDateDesc(a: PlaceVisit, b: PlaceVisit): number {
  const ta = Date.parse(a.dateVisited);
  const tb = Date.parse(b.dateVisited);
  const va = Number.isFinite(ta) ? ta : 0;
  const vb = Number.isFinite(tb) ? tb : 0;
  return vb - va || tsOf(b) - tsOf(a);
}

export const usePlaceStore = create<PlaceStoreState>()(
  persist(
    (set, get) => ({
      allVisits: [],
      visits: [],
      hydrated: false,

      getVisit: (id) => get().visits.find((v) => v.id === id),

      save: (visit) => {
        const stamped: PlaceVisit = {
          ...normalizeKinds(visit),
          updatedAt: new Date().toISOString(),
          deletedAt: visit.deletedAt ?? null,
        };
        set((s) => {
          const all = [
            stamped,
            ...s.allVisits.filter((v) => v.id !== stamped.id),
          ].sort(byVisitDateDesc);
          return { allVisits: all, visits: deriveLive(all) };
        });
        void fireUpsert(stamped);
      },

      update: (id, patch) => {
        const now = new Date().toISOString();
        let updated: PlaceVisit | undefined;
        set((s) => {
          const all = s.allVisits
            .map((v) => {
              if (v.id !== id) return v;
              const next: PlaceVisit = { ...v, ...patch, updatedAt: now };
              updated = next;
              return next;
            })
            .sort(byVisitDateDesc);
          return { allVisits: all, visits: deriveLive(all) };
        });
        if (updated) void fireUpsert(updated);
      },

      remove: (id) => {
        const now = new Date().toISOString();
        let tombstone: PlaceVisit | undefined;
        set((s) => {
          const all = s.allVisits.map((v) => {
            if (v.id !== id) return v;
            const next: PlaceVisit = { ...v, deletedAt: now, updatedAt: now };
            tombstone = next;
            return next;
          });
          return { allVisits: all, visits: deriveLive(all) };
        });
        if (tombstone) void fireUpsert(tombstone);
      },

      reset: () => set({ allVisits: [], visits: [] }),

      setAllFromRemote: (rows) => {
        set((s) => {
          const byId = new Map<string, PlaceVisit>();
          for (const v of s.allVisits) byId.set(v.id, v);
          for (const r of rows) {
            const row = normalizeKinds(r);
            const local = byId.get(row.id);
            if (!local || tsOf(row) >= tsOf(local)) byId.set(row.id, row);
          }
          const all = Array.from(byId.values()).sort(byVisitDateDesc);
          return { allVisits: all, visits: deriveLive(all) };
        });
      },
    }),
    {
      name: "origin-web/places/v1",
      version: 2,
      migrate: (persisted) => {
        // v1 -> v2: visits gain `kinds` (multi-kind places). The primary kind
        // becomes the single entry. Nothing is dropped.
        const state = persisted as { allVisits?: PlaceVisit[] } | undefined;
        if (!state?.allVisits) return persisted;
        return {
          ...state,
          allVisits: state.allVisits.map((v) => normalizeKinds(v)),
        };
      },
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.visits = deriveLive(state.allVisits);
          state.hydrated = true;
        }
      },
      partialize: (s) => ({ allVisits: s.allVisits }),
    },
  ),
);

/** Fire-and-forget upsert. Resolved lazily to avoid an import cycle (the sync
 *  service imports the store). Failures are swallowed: the next sync pass
 *  walks allVisits and re-pushes anything newer than lastPushAt. */
async function fireUpsert(visit: PlaceVisit): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    const mod = await import("@/lib/place-sync-service");
    await mod.placeSyncService.upsertOne(visit);
  } catch {
    /* offline / signed-out — queued for next focus */
  }
}
