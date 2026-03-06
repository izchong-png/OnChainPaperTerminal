"use client";

import { create } from "zustand";

interface PriceEntry {
  usdPrice: number;
  updatedAt: number;
}

interface PriceStore {
  prices: Record<string, PriceEntry>;
  setPrices: (prices: Record<string, number>) => void;
  getPrice: (mint: string) => number | null;
}

export const usePriceStore = create<PriceStore>()((set, get) => ({
  prices: {},

  setPrices: (newPrices) => {
    const now = Date.now();
    set((prev) => ({
      prices: {
        ...prev.prices,
        ...Object.fromEntries(
          Object.entries(newPrices).map(([mint, price]) => [
            mint,
            { usdPrice: price, updatedAt: now },
          ])
        ),
      },
    }));
  },

  getPrice: (mint) => {
    return get().prices[mint]?.usdPrice ?? null;
  },
}));
