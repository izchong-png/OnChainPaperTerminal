"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useTokenPrices } from "@/hooks/use-token-price";
import { SOL_MINT } from "@/lib/constants";
import { Token, TokenPnL } from "@/types";

function safe(n: number): number {
  return isFinite(n) ? n : 0;
}

export interface DailyPnL {
  date: string; // "YYYY-MM-DD"
  realized: number;
  trades: number;
}

export function usePnLData() {
  const trades = usePortfolioStore((s) => s.trades);

  const tradedMints = useMemo(() => {
    const mints = new Set<string>();
    for (const trade of trades) {
      if (trade.inputToken.mint !== SOL_MINT) mints.add(trade.inputToken.mint);
      if (trade.outputToken.mint !== SOL_MINT) mints.add(trade.outputToken.mint);
    }
    return Array.from(mints);
  }, [trades]);

  const { prices, loading: pricesLoading } = useTokenPrices(tradedMints);

  const pnlData = useMemo(() => {
    const tradesByToken = new Map<string, { token: Token; buys: typeof trades; sells: typeof trades }>();
    const chronological = [...trades].reverse();

    for (const trade of chronological) {
      if (trade.outputToken.mint !== SOL_MINT) {
        const mint = trade.outputToken.mint;
        if (!tradesByToken.has(mint)) {
          tradesByToken.set(mint, { token: trade.outputToken, buys: [], sells: [] });
        }
        tradesByToken.get(mint)!.buys.push(trade);
      }
      if (trade.inputToken.mint !== SOL_MINT) {
        const mint = trade.inputToken.mint;
        if (!tradesByToken.has(mint)) {
          tradesByToken.set(mint, { token: trade.inputToken, buys: [], sells: [] });
        }
        tradesByToken.get(mint)!.sells.push(trade);
      }
    }

    const results: TokenPnL[] = [];

    for (const [mint, { token, buys, sells }] of tradesByToken) {
      let totalHeld = 0;
      let totalCostBasis = 0;
      let totalBoughtUsd = 0;
      let totalSoldUsd = 0;
      let realizedPnl = 0;

      const allTrades = [
        ...buys.map((t) => ({ trade: t, isBuy: true })),
        ...sells.map((t) => ({ trade: t, isBuy: false })),
      ].sort((a, b) => a.trade.timestamp - b.trade.timestamp);

      const firstTradeAt = allTrades.length > 0 ? allTrades[0].trade.timestamp : 0;
      const lastTradeAt = allTrades.length > 0 ? allTrades[allTrades.length - 1].trade.timestamp : 0;

      for (const { trade, isBuy } of allTrades) {
        if (isBuy) {
          totalHeld += trade.outputAmount;
          totalCostBasis += trade.totalValueUsd;
          totalBoughtUsd += trade.totalValueUsd;
        } else {
          totalSoldUsd += trade.totalValueUsd;
          if (totalHeld > 0) {
            const proportionalCost = (trade.inputAmount / totalHeld) * totalCostBasis;
            realizedPnl += trade.totalValueUsd - proportionalCost;
            totalCostBasis -= proportionalCost;
            totalHeld -= trade.inputAmount;
          }
        }
      }

      if (totalHeld < 0.000001) totalHeld = 0;
      if (totalCostBasis < 0.000001) totalCostBasis = 0;

      const currentPrice = prices[mint] ?? 0;
      const currentValue = totalHeld * currentPrice;
      const unrealizedPnl = totalHeld > 0 ? currentValue - totalCostBasis : 0;
      const unrealizedPnlPct = totalCostBasis > 0 ? (unrealizedPnl / totalCostBasis) * 100 : 0;
      const totalPnl = realizedPnl + unrealizedPnl;
      const totalPnlPct = totalBoughtUsd > 0 ? (totalPnl / totalBoughtUsd) * 100 : 0;

      const totalBoughtAmount = buys.reduce((s, t) => s + t.outputAmount, 0);
      const avgEntry = totalBoughtAmount > 0 ? totalBoughtUsd / totalBoughtAmount : 0;

      results.push({
        token,
        mint,
        totalBuys: buys.length,
        totalSells: sells.length,
        totalBoughtUsd: safe(totalBoughtUsd),
        totalSoldUsd: safe(totalSoldUsd),
        avgEntryPrice: safe(avgEntry),
        currentAmount: safe(totalHeld),
        currentPrice: safe(currentPrice),
        currentValueUsd: safe(currentValue),
        remainingCostBasis: safe(totalCostBasis),
        realizedPnlUsd: safe(realizedPnl),
        unrealizedPnlUsd: safe(unrealizedPnl),
        unrealizedPnlPct: safe(unrealizedPnlPct),
        totalPnlUsd: safe(totalPnl),
        totalPnlPct: safe(totalPnlPct),
        status: totalHeld > 0.000001 ? "open" : "closed",
        firstTradeAt,
        lastTradeAt,
      });
    }

    results.sort((a, b) => Math.abs(b.totalPnlUsd) - Math.abs(a.totalPnlUsd));
    return results;
  }, [trades, prices]);

  // Compute daily P&L by replaying all trades grouped by day
  const dailyPnL = useMemo(() => {
    const daily = new Map<string, DailyPnL>();
    const chronological = [...trades].reverse();

    // Track per-token state for FIFO cost basis replay
    const tokenState = new Map<string, { held: number; costBasis: number }>();

    for (const trade of chronological) {
      const dateKey = format(trade.timestamp, "yyyy-MM-dd");

      if (!daily.has(dateKey)) {
        daily.set(dateKey, { date: dateKey, realized: 0, trades: 0 });
      }
      const day = daily.get(dateKey)!;
      day.trades++;

      // Determine the non-SOL token and whether this is a buy or sell of it
      const targets: { mint: string; isBuy: boolean; amount: number; valueUsd: number }[] = [];

      if (trade.outputToken.mint !== SOL_MINT) {
        targets.push({
          mint: trade.outputToken.mint,
          isBuy: true,
          amount: trade.outputAmount,
          valueUsd: trade.totalValueUsd,
        });
      }
      if (trade.inputToken.mint !== SOL_MINT) {
        targets.push({
          mint: trade.inputToken.mint,
          isBuy: false,
          amount: trade.inputAmount,
          valueUsd: trade.totalValueUsd,
        });
      }

      for (const { mint, isBuy, amount, valueUsd } of targets) {
        if (!tokenState.has(mint)) {
          tokenState.set(mint, { held: 0, costBasis: 0 });
        }
        const state = tokenState.get(mint)!;

        if (isBuy) {
          state.held += amount;
          state.costBasis += valueUsd;
        } else {
          if (state.held > 0) {
            const proportionalCost = (amount / state.held) * state.costBasis;
            day.realized += valueUsd - proportionalCost;
            state.costBasis -= proportionalCost;
            state.held -= amount;
          }
        }
      }
    }

    return daily;
  }, [trades]);

  const totals = useMemo(() => {
    const totalRealized = pnlData.reduce((s, p) => s + p.realizedPnlUsd, 0);
    const totalUnrealized = pnlData.reduce((s, p) => s + p.unrealizedPnlUsd, 0);
    const totalCombined = totalRealized + totalUnrealized;
    const totalInvested = pnlData.reduce((s, p) => s + p.totalBoughtUsd, 0);
    const totalReturnPct = totalInvested > 0 ? (totalCombined / totalInvested) * 100 : 0;
    const winningTokens = pnlData.filter((p) => p.totalPnlUsd > 0).length;
    const losingTokens = pnlData.filter((p) => p.totalPnlUsd < 0).length;

    return {
      totalRealized: safe(totalRealized),
      totalUnrealized: safe(totalUnrealized),
      totalCombined: safe(totalCombined),
      totalInvested: safe(totalInvested),
      totalReturnPct: safe(totalReturnPct),
      tokenCount: pnlData.length,
      winningTokens,
      losingTokens,
      winRate: pnlData.length > 0 ? (winningTokens / pnlData.length) * 100 : 0,
    };
  }, [pnlData]);

  return { pnlData, totals, dailyPnL, pricesLoading };
}
