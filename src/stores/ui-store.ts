"use client";

import { create } from "zustand";

interface UIStore {
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
}));
