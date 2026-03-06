"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { PendingOrder, Token } from "@/types";

interface OrdersState {
  orders: PendingOrder[];
}

interface OrdersActions {
  addOrder: (params: {
    mint: string;
    token: Token;
    type: "stop_loss" | "take_profit" | "limit_buy" | "limit_sell";
    triggerMcap?: number;
    amount: number;
    inputToken?: Token;
    spendAmount?: number;
  }) => void;
  removeOrder: (id: string) => void;
  getOrdersForMint: (mint: string) => PendingOrder[];
}

type OrdersStore = OrdersState & OrdersActions;

export const useOrdersStore = create<OrdersStore>()(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (params) => {
        const order: PendingOrder = {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          ...params,
        };
        set((prev) => ({ orders: [...prev.orders, order] }));
      },

      removeOrder: (id) => {
        set((prev) => ({
          orders: prev.orders.filter((o) => o.id !== id),
        }));
      },

      getOrdersForMint: (mint) => {
        return get().orders.filter((o) => o.mint === mint);
      },
    }),
    {
      name: "paper-orders",
      storage: createJSONStorage(() => localStorage),
      version: 4,
    }
  )
);
