"use client";

import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useHydration } from "@/hooks/use-hydration";

export default function HistoryPage() {
  const hydrated = useHydration();
  const trades = usePortfolioStore((s) => s.trades);

  if (!hydrated) {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-lg">Trade History</h1>
        <span className="text-sm text-muted-foreground">
          {trades.length} trades
        </span>
      </div>

      {trades.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No trades yet. Start trading to see your history here.
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Amount In</TableHead>
                <TableHead className="text-right">Amount Out</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(trade.timestamp, "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        trade.type === "buy"
                          ? "bg-positive/10 text-positive"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {trade.type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {trade.inputToken.logoURI && (
                        <img
                          src={trade.inputToken.logoURI}
                          alt=""
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <span className="text-sm font-medium">
                        {trade.inputToken.symbol}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {trade.outputToken.logoURI && (
                        <img
                          src={trade.outputToken.logoURI}
                          alt=""
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <span className="text-sm font-medium">
                        {trade.outputToken.symbol}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {trade.inputAmount.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {trade.outputAmount < 0.001
                      ? trade.outputAmount.toExponential(2)
                      : trade.outputAmount.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    ${trade.totalValueUsd.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground hidden sm:table-cell">
                    {trade.priceImpactPct.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
