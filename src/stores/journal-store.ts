"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface JournalEntry {
  text: string;
  updatedAt: number;
}

interface JournalState {
  entries: Record<string, JournalEntry>;
}

interface JournalActions {
  setEntry: (mint: string, text: string) => void;
  getEntry: (mint: string) => string;
}

type JournalStore = JournalState & JournalActions;

export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      entries: {},

      setEntry: (mint, text) => {
        const trimmed = text.slice(0, 300);
        set((prev) => ({
          entries: {
            ...prev.entries,
            [mint]: { text: trimmed, updatedAt: Date.now() },
          },
        }));
      },

      getEntry: (mint) => {
        return get().entries[mint]?.text ?? "";
      },
    }),
    {
      name: "paper-journal",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
