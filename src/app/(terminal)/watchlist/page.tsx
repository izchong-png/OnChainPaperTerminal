"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { TokenSearchDialog } from "@/components/search/token-search-dialog";
import { useWatchlistStore } from "@/stores/watchlist-store";
import { useTokenPrices } from "@/hooks/use-token-price";
import { useHydration } from "@/hooks/use-hydration";
import { SearchResult } from "@/types";

function safe(n: number): number {
  return isFinite(n) ? n : 0;
}

function fmtUsd(n: number): string {
  const v = safe(n);
  if (v === 0) return "-";
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  if (v >= 0.0001) return `$${v.toFixed(6)}`;
  return `$${v.toExponential(2)}`;
}

export default function WatchlistPage() {
  const hydrated = useHydration();
  const items = useWatchlistStore((s) => s.items);
  const removeToken = useWatchlistStore((s) => s.removeToken);
  const addToken = useWatchlistStore((s) => s.addToken);
  const [searchOpen, setSearchOpen] = useState(false);

  const mints = useMemo(() => items.map((i) => i.token.mint), [items]);
  const { prices, loading: pricesLoading } = useTokenPrices(mints);

  const handleAdd = (result: SearchResult) => {
    addToken(result.token, result.pairAddress);
  };

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
        <h1 className="font-bold text-lg">Watchlist</h1>
        <Button size="sm" onClick={() => setSearchOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Token
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm mb-3">
            Your watchlist is empty. Add tokens to track their prices.
          </p>
          <Button variant="outline" onClick={() => setSearchOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Token
          </Button>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Value of 1 SOL</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const price = prices[item.token.mint] ?? 0;
                const solPrice = prices["So11111111111111111111111111111111111111112"] ?? 0;
                const tokensPerSol = price > 0 && solPrice > 0 ? solPrice / price : 0;

                return (
                  <TableRow key={item.token.mint} className="hover:bg-accent">
                    <TableCell className="py-2.5">
                      <Link
                        href={`/trade/${item.token.mint}`}
                        className="flex items-center gap-2"
                      >
                        {item.token.logoURI ? (
                          <img
                            src={item.token.logoURI}
                            alt={item.token.symbol}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                            {item.token.symbol.charAt(0)}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-sm">
                            {item.token.symbol}
                          </span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {item.token.name}
                          </span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm py-2.5">
                      {pricesLoading && price === 0 ? (
                        <Skeleton className="h-4 w-20 ml-auto" />
                      ) : (
                        fmtUsd(price)
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground py-2.5 hidden sm:table-cell">
                      {tokensPerSol > 0
                        ? tokensPerSol >= 1
                          ? tokensPerSol.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : tokensPerSol.toFixed(6)
                        : "-"}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeToken(item.token.mint)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <TokenSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={handleAdd}
      />
    </div>
  );
}
