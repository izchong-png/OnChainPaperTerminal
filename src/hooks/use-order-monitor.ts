"use client";

import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useOrdersStore } from "@/stores/orders-store";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useTokenPrices } from "@/hooks/use-token-price";
import { SOL_MINT, SOL_TOKEN } from "@/lib/constants";

function fmtMcap(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}

function fmtPrice(n: number): string {
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toExponential(2);
}

export function useOrderMonitor() {
  const orders = useOrdersStore((s) => s.orders);
  const removeOrder = useOrdersStore((s) => s.removeOrder);
  const executeTrade = usePortfolioStore((s) => s.executeTrade);
  const balances = usePortfolioStore((s) => s.balances);

  const mints = useMemo(
    () => [...new Set([SOL_MINT, ...orders.map((o) => o.mint)])],
    [orders]
  );

  const { prices, marketCaps } = useTokenPrices(mints);

  // Use ref to avoid stale closures in the effect
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const pricesRef = useRef(prices);
  pricesRef.current = prices;
  const marketCapsRef = useRef(marketCaps);
  marketCapsRef.current = marketCaps;
  const balancesRef = useRef(balances);
  balancesRef.current = balances;

  useEffect(() => {
    const currentOrders = ordersRef.current;
    const currentPrices = pricesRef.current;
    const currentMcaps = marketCapsRef.current;
    const currentBalances = balancesRef.current;
    const solPrice = currentPrices[SOL_MINT] ?? 0;

    for (const order of currentOrders) {
      const price = currentPrices[order.mint];
      if (!price || price <= 0) continue;

      // --- Limit Buy (market cap based) ---
      if (order.type === "limit_buy" && order.triggerMcap && order.spendAmount) {
        const mcap = currentMcaps[order.mint];
        if (!mcap || mcap <= 0) continue;

        if (mcap <= order.triggerMcap) {
          const solBal = currentBalances[SOL_MINT]?.amount ?? 0;
          const spend = Math.min(order.spendAmount, solBal);
          if (spend <= 0 || solPrice <= 0) { removeOrder(order.id); continue; }

          const totalValueUsd = spend * solPrice;
          const outputAmount = totalValueUsd / price;

          if (outputAmount > 0) {
            const success = executeTrade({
              type: "buy",
              inputToken: SOL_TOKEN,
              outputToken: order.token,
              inputAmount: spend,
              outputAmount,
              pricePerToken: price,
              priceImpactPct: 0,
              totalValueUsd,
            });
            if (success) {
              toast.success(`Limit buy executed: ${order.token.symbol} at MC $${fmtMcap(mcap)}`);
            }
          }
          removeOrder(order.id);
        }
        continue;
      }

      // --- Limit Sell (market cap based) ---
      if (order.type === "limit_sell" && order.triggerMcap) {
        const mcap = currentMcaps[order.mint];
        if (!mcap || mcap <= 0) continue;

        const balance = currentBalances[order.mint];
        if (!balance || balance.amount < 0.000001) { removeOrder(order.id); continue; }

        if (mcap >= order.triggerMcap) {
          const sellAmount = Math.min(order.amount, balance.amount);
          if (sellAmount <= 0 || solPrice <= 0) { removeOrder(order.id); continue; }

          const totalValueUsd = sellAmount * price;
          const outputAmount = totalValueUsd / solPrice;

          if (outputAmount > 0) {
            const success = executeTrade({
              type: "sell",
              inputToken: order.token,
              outputToken: SOL_TOKEN,
              inputAmount: sellAmount,
              outputAmount,
              pricePerToken: price,
              priceImpactPct: 0,
              totalValueUsd,
            });
            if (success) {
              toast.success(`Limit sell executed: ${order.token.symbol} at MC $${fmtMcap(mcap)}`);
            }
          }
          removeOrder(order.id);
        }
        continue;
      }

      // --- SL/TP (market cap based) ---
      const mcap = currentMcaps[order.mint];
      if (!mcap || mcap <= 0) continue;

      // Clean up SL/TP for positions that no longer exist
      const balance = currentBalances[order.mint];
      if (!balance || balance.amount < 0.000001) {
        removeOrder(order.id);
        continue;
      }

      let triggered = false;

      if (order.type === "stop_loss" && order.triggerMcap && mcap <= order.triggerMcap) {
        triggered = true;
      } else if (order.type === "take_profit" && order.triggerMcap && mcap >= order.triggerMcap) {
        triggered = true;
      }

      if (triggered) {
        const sellAmount = Math.min(order.amount, balance.amount);
        if (solPrice <= 0) continue;
        const totalValueUsd = sellAmount * price;
        const outputAmount = totalValueUsd / solPrice;

        if (outputAmount > 0) {
          const success = executeTrade({
            type: "sell",
            inputToken: order.token,
            outputToken: SOL_TOKEN,
            inputAmount: sellAmount,
            outputAmount,
            pricePerToken: price,
            priceImpactPct: 0,
            totalValueUsd,
          });

          if (success) {
            const label =
              order.type === "stop_loss" ? "Stop loss" : "Take profit";
            toast.success(
              `${label} triggered for ${order.token.symbol} at MC $${fmtMcap(mcap)}`
            );
          }
        }

        removeOrder(order.id);
      }
    }
  }, [prices, marketCaps, orders, balances, removeOrder, executeTrade]);
}
