"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Token, TokenBalance, PaperTrade, TradeType } from "@/types";
import { SOL_TOKEN, SOL_MINT, DEFAULT_INITIAL_SOL } from "@/lib/constants";

interface PortfolioState {
  balances: Record<string, TokenBalance>;
  trades: PaperTrade[];
  totalRealizedPnlUsd: number;
  initialSolBalance: number;
  createdAt: number;
}

interface PortfolioActions {
  executeTrade: (params: {
    type: TradeType;
    inputToken: Token;
    outputToken: Token;
    inputAmount: number;
    outputAmount: number;
    pricePerToken: number;
    priceImpactPct: number;
    totalValueUsd: number;
  }) => boolean;
  getBalance: (mint: string) => number;
  addSol: (amount: number) => void;
  resetPortfolio: (initialSol?: number) => void;
}

type PortfolioStore = PortfolioState & PortfolioActions;

function createInitialState(initialSol: number = DEFAULT_INITIAL_SOL): PortfolioState {
  return {
    balances: {
      [SOL_MINT]: {
        token: SOL_TOKEN,
        amount: initialSol,
        costBasisUsd: 0,
        costBasisPerToken: 0,
      },
    },
    trades: [],
    totalRealizedPnlUsd: 0,
    initialSolBalance: initialSol,
    createdAt: Date.now(),
  };
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      executeTrade: (params) => {
        const state = get();
        const inputBalance = state.balances[params.inputToken.mint];

        // Validate sufficient balance
        if (!inputBalance || inputBalance.amount < params.inputAmount) {
          return false;
        }

        const trade: PaperTrade = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          ...params,
        };

        set((prev) => {
          const newBalances = { ...prev.balances };

          // Deduct input token
          const prevInput = newBalances[params.inputToken.mint];
          if (prevInput) {
            const newAmount = prevInput.amount - params.inputAmount;
            if (newAmount <= 0.000001) {
              // Clean up dust
              delete newBalances[params.inputToken.mint];
            } else {
              newBalances[params.inputToken.mint] = {
                ...prevInput,
                amount: newAmount,
                // Cost basis decreases proportionally
                costBasisUsd:
                  prevInput.costBasisUsd *
                  (newAmount / prevInput.amount),
              };
            }
          }

          // Add output token
          const prevOutput = newBalances[params.outputToken.mint];
          if (prevOutput) {
            const newAmount = prevOutput.amount + params.outputAmount;
            const newCostBasis =
              prevOutput.costBasisUsd + params.totalValueUsd;
            newBalances[params.outputToken.mint] = {
              ...prevOutput,
              amount: newAmount,
              costBasisUsd: newCostBasis,
              costBasisPerToken: newCostBasis / newAmount,
            };
          } else {
            newBalances[params.outputToken.mint] = {
              token: params.outputToken,
              amount: params.outputAmount,
              costBasisUsd: params.totalValueUsd,
              costBasisPerToken: params.totalValueUsd / params.outputAmount,
            };
          }

          return {
            balances: newBalances,
            trades: [trade, ...prev.trades],
          };
        });

        return true;
      },

      getBalance: (mint: string) => {
        return get().balances[mint]?.amount ?? 0;
      },

      addSol: (amount: number) => {
        set((prev) => {
          const prevSol = prev.balances[SOL_MINT];
          return {
            balances: {
              ...prev.balances,
              [SOL_MINT]: {
                token: SOL_TOKEN,
                amount: (prevSol?.amount ?? 0) + amount,
                costBasisUsd: prevSol?.costBasisUsd ?? 0,
                costBasisPerToken: prevSol?.costBasisPerToken ?? 0,
              },
            },
          };
        });
      },

      resetPortfolio: (initialSol?: number) => {
        set(createInitialState(initialSol ?? get().initialSolBalance));
      },
    }),
    {
      name: "paper-portfolio",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<PortfolioState> | undefined;
        if (!persistedState || !persistedState.balances) return current;
        return {
          ...current,
          ...persistedState,
          balances: persistedState.balances,
          trades: persistedState.trades ?? [],
        };
      },
    }
  )
);
