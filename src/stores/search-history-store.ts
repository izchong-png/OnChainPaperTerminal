"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SearchResult } from "@/types";

const MAX_RECENT = 5;

interface SearchHistoryState {
  recentTokens: SearchResult[];
}

interface SearchHistoryActions {
  addRecent: (result: SearchResult) => void;
  clearRecent: () => void;
}

type SearchHistoryStore = SearchHistoryState & SearchHistoryActions;

export const useSearchHistoryStore = create<SearchHistoryStore>()(
  persist(
    (set) => ({
      recentTokens: [],

      addRecent: (result) => {
        set((prev) => {
          const filtered = prev.recentTokens.filter(
            (r) => r.token.mint !== result.token.mint
          );
          return { recentTokens: [result, ...filtered].slice(0, MAX_RECENT) };
        });
      },

      clearRecent: () => {
        set({ recentTokens: [] });
      },
    }),
    {
      name: "paper-search-history",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
