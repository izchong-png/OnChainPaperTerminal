"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useHydration } from "@/hooks/use-hydration";
import { useTokenPrices } from "@/hooks/use-token-price";
import { SOL_MINT } from "@/lib/constants";

export default function DashboardPage() {
  const hydrated = useHydration();
  const balances = usePortfolioStore((s) => s.balances);
  const tradeCount = usePortfolioStore((s) => s.trades.length);
  const resetPortfolio = usePortfolioStore((s) => s.resetPortfolio);
  const [confirmReset, setConfirmReset] = useState(false);

  const holdingMints = Object.keys(balances);
  const { prices } = useTokenPrices(holdingMints);

  const totalValue = Object.entries(balances).reduce((acc, [mint, bal]) => {
    const price = prices[mint] ?? 0;
    return acc + bal.amount * price;
  }, 0);

  const positionCount = Object.keys(balances).filter(
    (m) => m !== SOL_MINT
  ).length;

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1">
              Portfolio Value
            </div>
            {hydrated ? (
              <div className="font-mono text-xl font-bold">
                ${totalValue.toFixed(2)}
              </div>
            ) : (
              <Skeleton className="h-7 w-28" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1">
              SOL Balance
            </div>
            {hydrated ? (
              <div className="font-mono text-xl font-bold">
                {(balances[SOL_MINT]?.amount ?? 0).toFixed(4)}
              </div>
            ) : (
              <Skeleton className="h-7 w-28" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1">Positions</div>
            {hydrated ? (
              <div className="font-mono text-xl font-bold">{positionCount}</div>
            ) : (
              <Skeleton className="h-7 w-12" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1">Trades</div>
            {hydrated ? (
              <div className="font-mono text-xl font-bold">{tradeCount}</div>
            ) : (
              <Skeleton className="h-7 w-12" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Button asChild>
          <Link href={`/trade/${SOL_MINT}`}>
            Start Trading
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/portfolio">View Portfolio</Link>
        </Button>
        {confirmReset ? (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-destructive">Reset all data?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                resetPortfolio();
                setConfirmReset(false);
              }}
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset Portfolio
          </Button>
        )}
      </div>

    </div>
  );
}
