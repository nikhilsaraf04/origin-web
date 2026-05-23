// Zustand store mirroring Origin/Store/CoffeeStore.swift.
// Persists to localStorage via Zustand's persist middleware.

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CoffeeLog } from "@/lib/types/models";
import {
  type TasteProfile,
  TasteProfileMinLogs,
  computeTasteProfile,
} from "@/lib/types/taste-profile";

interface CoffeeStoreState {
  logs: CoffeeLog[];
  hydrated: boolean;

  // Selectors
  tasteProfile: () => TasteProfile | null;
  getLog: (id: string) => CoffeeLog | undefined;

  // Mutations
  save: (log: CoffeeLog) => void;
  update: (id: string, patch: Partial<CoffeeLog>) => void;
  remove: (id: string) => void;
  reset: () => void;
}

export const useCoffeeStore = create<CoffeeStoreState>()(
  persist(
    (set, get) => ({
      logs: [],
      hydrated: false,

      tasteProfile: () => {
        const logs = get().logs;
        if (logs.length < TasteProfileMinLogs) return null;
        return computeTasteProfile(logs);
      },
      getLog: (id) => get().logs.find((l) => l.id === id),

      save: (log) => {
        set((s) => ({ logs: [log, ...s.logs] }));
      },
      update: (id, patch) => {
        set((s) => ({
          logs: s.logs.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }));
      },
      remove: (id) => {
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) }));
      },
      reset: () => set({ logs: [] }),
    }),
    {
      name: "origin-web/v1",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      partialize: (s) => ({ logs: s.logs }),
    },
  ),
);
