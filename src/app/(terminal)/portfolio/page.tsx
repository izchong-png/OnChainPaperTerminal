"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PositionsTable } from "@/components/portfolio/positions-table";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useTokenPrices } from "@/hooks/use-token-price";
import { useHydration } from "@/hooks/use-hydration";
import { SOL_MINT } from "@/lib/constants";

function safe(n: number): number {
  return isFinite(n) ? n : 0;
}

export default function PortfolioPage() {
  const hydrated = useHydration();
  const balances = usePortfolioStore((s) => s.balances);
  const holdingMints = useMemo(() => Object.keys(balances), [balances]);
  const { prices } = useTokenPrices(holdingMints);

  const totalValue = Object.entries(balances).reduce((s, [mint, bal]) => {
    return s + bal.amount * (prices[mint] ?? 0);
  }, 0);

  const totalPnl = Object.entries(balances)
    .filter(([mint]) => mint !== SOL_MINT)
    .reduce((s, [mint, bal]) => {
      const currentValue = bal.amount * (prices[mint] ?? 0);
      return s + (bal.costBasisUsd > 0 ? currentValue - bal.costBasisUsd : 0);
    }, 0);

  const positionCount = Object.keys(balances).length;

  if (!hydrated) {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <h1 className="font-bold text-lg">Portfolio</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1">
              Total Value
            </div>
            <div className="font-mono text-xl font-bold">
              ${safe(totalValue).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1">
              Unrealized PnL
            </div>
            <div
              className={`font-mono text-xl font-bold ${
                totalPnl >= 0 ? "text-positive" : "text-destructive"
              }`}
            >
              {totalPnl >= 0 ? "+" : ""}${safe(totalPnl).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1">Positions</div>
            <div className="font-mono text-xl font-bold">
              {positionCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      <Card>
        <PositionsTable />
      </Card>
    </div>
  );
}
