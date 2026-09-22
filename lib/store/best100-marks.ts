// Local-only marks for the Best 100 list: visited flag, note, 0-10 rating.
// Persisted to localStorage via Zustand persist - never synced. Keyed by the
// seed's stable shop id (normalized name), so a yearly seed refresh that
// keeps the same shop keeps the mark.

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Best100Mark {
  visited: boolean;
  note: string;
  /** 0 = unrated, otherwise 1..10 */
  rating: number;
}

interface Best100MarksState {
  marks: Record<string, Best100Mark>;
  hydrated: boolean;

  getMark: (id: string) => Best100Mark | undefined;
  toggleVisited: (id: string) => void;
  setNoteRating: (id: string, note: string, rating: number) => void;
  setHydrated: () => void;
}

export const useBest100Marks = create<Best100MarksState>()(
  persist(
    (set, get) => ({
      marks: {},
      hydrated: false,

      getMark: (id) => get().marks[id],

      toggleVisited: (id) =>
        set((state) => {
          const cur = state.marks[id] ?? { visited: false, note: "", rating: 0 };
          return { marks: { ...state.marks, [id]: { ...cur, visited: !cur.visited } } };
        }),

      setNoteRating: (id, note, rating) =>
        set((state) => {
          const cur = state.marks[id] ?? { visited: false, note: "", rating: 0 };
          return { marks: { ...state.marks, [id]: { ...cur, note, rating } } };
        }),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "best100-marks",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ marks: state.marks }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
