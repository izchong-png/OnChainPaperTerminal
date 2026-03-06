"use client";

import { useState, useMemo } from "react";
import { Calculator, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useTokenPrices } from "@/hooks/use-token-price";
import { useHydration } from "@/hooks/use-hydration";
import { SOL_MINT } from "@/lib/constants";

function safe(n: number): number {
  return isFinite(n) ? n : 0;
}

function fmtMcap(n: number): string {
  const v = safe(n);
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

interface PositionSizeCalculatorProps {
  tokenSymbol: string | null;
  tokenPrice: number | null;
  marketCap: number | null;
}

export function PositionSizeCalculator({
  tokenSymbol,
  tokenPrice,
  marketCap,
}: PositionSizeCalculatorProps) {
  const hydrated = useHydration();
  const balances = usePortfolioStore((s) => s.balances);
  const holdingMints = useMemo(() => Object.keys(balances), [balances]);
  const { prices } = useTokenPrices(holdingMints);

  const [riskPct, setRiskPct] = useState<string>("2");
  const [stopLossPct, setStopLossPct] = useState<string>("10");
  const [takeProfitPct, setTakeProfitPct] = useState<string>("20");

  const portfolioValue = useMemo(() => {
    return Object.entries(balances).reduce((sum, [mint, bal]) => {
      return sum + bal.amount * (prices[mint] ?? 0);
    }, 0);
  }, [balances, prices]);

  const solPrice = prices[SOL_MINT] ?? 0;

  const calc = useMemo(() => {
    const risk = parseFloat(riskPct) || 0;
    const sl = parseFloat(stopLossPct) || 0;
    const tp = parseFloat(takeProfitPct) || 0;
    const entry = tokenPrice ?? 0;
    const mcap = marketCap ?? 0;

    if (risk <= 0 || sl <= 0 || entry <= 0 || portfolioValue <= 0) {
      return null;
    }

    const riskAmountUsd = portfolioValue * (risk / 100);
    const stopLossPrice = entry * (1 - sl / 100);
    const takeProfitPrice = entry * (1 + tp / 100);
    const riskPerToken = entry - stopLossPrice;

    if (riskPerToken <= 0) return null;

    const positionSizeTokens = riskAmountUsd / riskPerToken;
    const positionSizeUsd = positionSizeTokens * entry;
    const positionSizeSol = solPrice > 0 ? positionSizeUsd / solPrice : 0;
    const portfolioPct = (positionSizeUsd / portfolioValue) * 100;

    const potentialLossUsd = riskAmountUsd;
    const potentialGainUsd = positionSizeTokens * (takeProfitPrice - entry);
    const rewardRiskRatio = tp > 0 && sl > 0 ? tp / sl : 0;

    // Market cap at each level (scales proportionally with price)
    const entryMcap = mcap;
    const stopLossMcap = mcap > 0 ? mcap * (1 - sl / 100) : 0;
    const takeProfitMcap = mcap > 0 ? mcap * (1 + tp / 100) : 0;

    return {
      riskAmountUsd: safe(riskAmountUsd),
      stopLossPrice: safe(stopLossPrice),
      takeProfitPrice: safe(takeProfitPrice),
      positionSizeTokens: safe(positionSizeTokens),
      positionSizeUsd: safe(positionSizeUsd),
      positionSizeSol: safe(positionSizeSol),
      portfolioPct: safe(portfolioPct),
      potentialLossUsd: safe(potentialLossUsd),
      potentialGainUsd: safe(potentialGainUsd),
      rewardRiskRatio: safe(rewardRiskRatio),
      entryMcap: safe(entryMcap),
      stopLossMcap: safe(stopLossMcap),
      takeProfitMcap: safe(takeProfitMcap),
    };
  }, [riskPct, stopLossPct, takeProfitPct, tokenPrice, marketCap, portfolioValue, solPrice]);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Calculator className="h-3.5 w-3.5" />
          Position Size Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Inputs */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Risk %
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    Percentage of your total portfolio you&apos;re willing to lose on this trade.
                    Common: 1-3%.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Input
                type="number"
                min="0.1"
                max="100"
                step="0.5"
                value={riskPct}
                onChange={(e) => setRiskPct(e.target.value)}
                className="font-mono text-sm h-8 pr-6"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Stop Loss
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    How far below entry you set your stop loss. E.g. 10% means you exit if mcap
                    drops 10%.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Input
                type="number"
                min="0.1"
                max="100"
                step="1"
                value={stopLossPct}
                onChange={(e) => setStopLossPct(e.target.value)}
                className="font-mono text-sm h-8 pr-6"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Take Profit
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    Target mcap gain above entry. E.g. 20% means you take profit when mcap
                    rises 20%.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Input
                type="number"
                min="0.1"
                max="10000"
                step="5"
                value={takeProfitPct}
                onChange={(e) => setTakeProfitPct(e.target.value)}
                className="font-mono text-sm h-8 pr-6"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Quick risk presets */}
        <div className="flex gap-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground mr-1 self-center">Risk:</span>
          {[1, 2, 3, 5].map((r) => (
            <Button
              key={r}
              variant={riskPct === r.toString() ? "default" : "ghost"}
              size="sm"
              className="h-5 text-[10px] px-1.5"
              onClick={() => setRiskPct(r.toString())}
            >
              {r}%
            </Button>
          ))}
          <span className="text-[10px] text-muted-foreground ml-2 mr-1 self-center">SL:</span>
          {[5, 10, 15, 25].map((s) => (
            <Button
              key={s}
              variant={stopLossPct === s.toString() ? "default" : "ghost"}
              size="sm"
              className="h-5 text-[10px] px-1.5"
              onClick={() => setStopLossPct(s.toString())}
            >
              {s}%
            </Button>
          ))}
        </div>

        {/* Results */}
        {calc && hydrated ? (
          <div className="rounded-lg bg-secondary p-3 space-y-2">
            {/* Primary result */}
            <div className="text-center pb-2 border-b border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                Recommended Position Size
              </div>
              <div className="font-mono text-lg font-bold text-primary">
                {calc.positionSizeSol.toFixed(4)} SOL
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                ${calc.positionSizeUsd.toFixed(2)} · {calc.portfolioPct.toFixed(1)}% of portfolio
              </div>
            </div>

            {/* Entry / SL / TP by Market Cap */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Entry MCap</span>
                <span className="font-mono">
                  {calc.entryMcap > 0 ? fmtMcap(calc.entryMcap) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Stop Loss MCap</span>
                <span className="font-mono text-destructive">
                  {calc.stopLossMcap > 0 ? fmtMcap(calc.stopLossMcap) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Take Profit MCap</span>
                <span className="font-mono text-positive">
                  {calc.takeProfitMcap > 0 ? fmtMcap(calc.takeProfitMcap) : "-"}
                </span>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-1.5 border-t border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Portfolio</span>
                <span className="font-mono">${safe(portfolioValue).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Amount</span>
                <span className="font-mono">${calc.riskAmountUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Loss</span>
                <span className="font-mono text-destructive">
                  -${calc.potentialLossUsd.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Gain</span>
                <span className="font-mono text-positive">
                  +${calc.potentialGainUsd.toFixed(2)}
                </span>
              </div>
            </div>

            {/* R:R Ratio */}
            <div className="flex items-center justify-between pt-1.5 border-t border-border">
              <span className="text-xs text-muted-foreground">Reward/Risk Ratio</span>
              <span
                className={`font-mono text-sm font-semibold ${
                  calc.rewardRiskRatio >= 2
                    ? "text-positive"
                    : calc.rewardRiskRatio >= 1
                      ? "text-yellow-500"
                      : "text-destructive"
                }`}
              >
                {calc.rewardRiskRatio.toFixed(2)}R
              </span>
            </div>

            {/* Warnings */}
            {calc.portfolioPct > 20 && (
              <div className="text-[10px] text-destructive bg-destructive/10 rounded px-2 py-1">
                Position is {calc.portfolioPct.toFixed(0)}% of portfolio — consider reducing risk %
                or widening stop loss.
              </div>
            )}
            {calc.rewardRiskRatio < 1 && (
              <div className="text-[10px] text-yellow-500 bg-yellow-500/10 rounded px-2 py-1">
                R:R below 1.0 — potential loss exceeds potential gain. Consider a tighter stop loss
                or wider take profit.
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-secondary p-4 text-center text-xs text-muted-foreground">
            {!tokenPrice
              ? "Loading token price..."
              : "Enter risk parameters to calculate position size."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
