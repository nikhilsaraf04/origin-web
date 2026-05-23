// Zustand store mirroring Origin/Store/CoffeeStore.swift.
// Persists to localStorage via Zustand's persist middleware.
//
// v0.3.0: every mutation stamps `updatedAt`; deletes are soft (set
// `deletedAt`) so the sync layer can push the tombstone to Supabase.
// Reads filter out soft-deleted rows. A new `setAllFromRemote` action
// lets the sync service merge pulled rows in by last-write-wins.

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CoffeeLog, ScanResult } from "@/lib/types/models";
import {
  type TasteProfile,
  TasteProfileMinLogs,
  computeTasteProfile,
} from "@/lib/types/taste-profile";

interface CoffeeStoreState {
  /** All logs known to the client, INCLUDING soft-deleted ones. Most consumers
   *  should read from `logs` which filters tombstones out. */
  allLogs: CoffeeLog[];
  /** Live (non-deleted) logs — what the UI cares about. */
  logs: CoffeeLog[];
  hydrated: boolean;

  /** Transient scan result used to ferry data between /scan, /match and /review.
   * Not persisted — re-read from sessionStorage as needed. */
  pendingScan: ScanResult | null;

  // Selectors
  tasteProfile: () => TasteProfile | null;
  getLog: (id: string) => CoffeeLog | undefined;

  // Mutations
  save: (log: CoffeeLog) => void;
  update: (id: string, patch: Partial<CoffeeLog>) => void;
  remove: (id: string) => void;
  reset: () => void;
  setPendingScan: (scan: ScanResult | null) => void;

  /** Merge a batch of rows (typically pulled from Supabase) into the local
   *  cache by last-write-wins on `updatedAt`. Newer remote rows clobber
   *  older locals; older remote rows are ignored. */
  setAllFromRemote: (rows: CoffeeLog[]) => void;
}

/** A row is "alive" iff it has no deletedAt timestamp. */
function isAlive(l: CoffeeLog): boolean {
  return !l.deletedAt;
}

function deriveLive(all: CoffeeLog[]): CoffeeLog[] {
  return all.filter(isAlive);
}

/** Best-effort timestamp comparator — falls back to createdAt for legacy
 *  logs that pre-date the sync work and don't carry `updatedAt`. */
function tsOf(l: CoffeeLog): number {
  const t = l.updatedAt ?? l.createdAt;
  const n = t ? Date.parse(t) : NaN;
  return Number.isFinite(n) ? n : 0;
}

export const useCoffeeStore = create<CoffeeStoreState>()(
  persist(
    (set, get) => ({
      allLogs: [],
      logs: [],
      hydrated: false,
      pendingScan: null,

      tasteProfile: () => {
        const logs = get().logs;
        if (logs.length < TasteProfileMinLogs) return null;
        return computeTasteProfile(logs);
      },
      getLog: (id) => get().logs.find((l) => l.id === id),

      save: (log) => {
        const stamped: CoffeeLog = {
          ...log,
          updatedAt: log.updatedAt ?? new Date().toISOString(),
          deletedAt: log.deletedAt ?? null,
        };
        set((s) => {
          const all = [stamped, ...s.allLogs.filter((l) => l.id !== stamped.id)];
          return { allLogs: all, logs: deriveLive(all) };
        });
        void fireUpsert(stamped);
      },
      update: (id, patch) => {
        const now = new Date().toISOString();
        let updated: CoffeeLog | undefined;
        set((s) => {
          const all = s.allLogs.map((l) => {
            if (l.id !== id) return l;
            const next: CoffeeLog = { ...l, ...patch, updatedAt: now };
            updated = next;
            return next;
          });
          return { allLogs: all, logs: deriveLive(all) };
        });
        if (updated) void fireUpsert(updated);
      },
      remove: (id) => {
        const now = new Date().toISOString();
        let tombstone: CoffeeLog | undefined;
        set((s) => {
          const all = s.allLogs.map((l) => {
            if (l.id !== id) return l;
            const next: CoffeeLog = { ...l, deletedAt: now, updatedAt: now };
            tombstone = next;
            return next;
          });
          return { allLogs: all, logs: deriveLive(all) };
        });
        if (tombstone) void fireUpsert(tombstone);
      },
      reset: () => set({ allLogs: [], logs: [] }),
      setPendingScan: (scan) => set({ pendingScan: scan }),

      setAllFromRemote: (rows) => {
        set((s) => {
          const byId = new Map<string, CoffeeLog>();
          for (const l of s.allLogs) byId.set(l.id, l);
          for (const r of rows) {
            const local = byId.get(r.id);
            if (!local || tsOf(r) >= tsOf(local)) {
              byId.set(r.id, r);
            }
          }
          // Stable order: most-recent updatedAt first, mirroring save() which
          // prepends. This keeps the Library view in a sane order after sync.
          const all = Array.from(byId.values()).sort(
            (a, b) => tsOf(b) - tsOf(a),
          );
          return { allLogs: all, logs: deriveLive(all) };
        });
      },
    }),
    {
      name: "origin-web/v1",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Legacy persisted shape stored everything under `logs`. Migrate to
          // `allLogs` and derive the live view from it. Tombstones from
          // legacy data won't exist, so this is a no-op for fresh installs.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const legacy = (state as any).logs as CoffeeLog[] | undefined;
          if (legacy && legacy.length > 0 && state.allLogs.length === 0) {
            state.allLogs = legacy;
          }
          state.logs = deriveLive(state.allLogs);
          state.hydrated = true;
        }
      },
      // pendingScan is intentionally excluded — it's transient.
      partialize: (s) => ({ allLogs: s.allLogs }),
    },
  ),
);

/** Fire-and-forget upsert to Supabase. Resolved lazily to avoid an import
 *  cycle (sync-service depends on the store too). Failures are swallowed —
 *  the next sync pass will retry by walking `allLogs` and picking up any
 *  row whose `updatedAt > lastPushAt`. */
async function fireUpsert(log: CoffeeLog): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    const mod = await import("@/lib/supabase/sync-service");
    await mod.syncService.upsertOne(log);
  } catch {
    /* offline / signed-out — queued for next focus */
  }
}
