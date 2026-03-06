"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Token, WatchlistItem } from "@/types";

interface WatchlistStore {
  items: WatchlistItem[];
  addToken: (token: Token, poolAddress: string) => void;
  removeToken: (mint: string) => void;
  isWatched: (mint: string) => boolean;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addToken: (token, poolAddress) => {
        if (get().items.some((i) => i.token.mint === token.mint)) return;
        set((prev) => ({
          items: [
            ...prev.items,
            { token, poolAddress, addedAt: Date.now() },
          ],
        }));
      },

      removeToken: (mint) => {
        set((prev) => ({
          items: prev.items.filter((i) => i.token.mint !== mint),
        }));
      },

      isWatched: (mint) => {
        return get().items.some((i) => i.token.mint === mint);
      },
    }),
    {
      name: "paper-watchlist",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
