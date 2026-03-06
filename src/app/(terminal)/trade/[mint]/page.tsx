"use client";

import { useEffect, useState, use, useCallback } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { ChartContainer } from "@/components/chart/chart-container";
import { SwapPanel } from "@/components/swap/swap-panel";
import { InstantTradePopup } from "@/components/swap/instant-trade-popup";
import { PositionsTable } from "@/components/portfolio/positions-table";
import { PositionSizeCalculator } from "@/components/swap/position-size-calculator";
import { useTokenPrice } from "@/hooks/use-token-price";
import { useWatchlistStore } from "@/stores/watchlist-store";
import { getTopPool } from "@/lib/api/dexscreener";
import { Token, DexScreenerPair } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TradePage({
  params,
}: {
  params: Promise<{ mint: string }>;
}) {
  const { mint } = use(params);
  const [poolData, setPoolData] = useState<DexScreenerPair | null>(null);
  const [loading, setLoading] = useState(true);
  const { price } = useTokenPrice(mint);
  const isWatched = useWatchlistStore((s) => s.isWatched(mint));
  const addToWatchlist = useWatchlistStore((s) => s.addToken);
  const removeFromWatchlist = useWatchlistStore((s) => s.removeToken);
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(mint).then(() => {
      setCopied(true);
      toast.success("Contract address copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }, [mint]);

  useEffect(() => {
    setLoading(true);
    getTopPool(mint)
      .then((data) => setPoolData(data))
      .finally(() => setLoading(false));
  }, [mint]);

  const token: Token | null = poolData
    ? {
        mint: poolData.baseToken.address,
        symbol: poolData.baseToken.symbol,
        name: poolData.baseToken.name,
        decimals: 9,
        logoURI: poolData.info?.imageUrl,
        verified: false,
      }
    : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top: Chart + Swap */}
      <div className="flex-1 p-2 sm:p-4 pb-0 gap-4 flex flex-col lg:flex-row min-h-0">
        {/* Chart Section */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Token Info Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 px-1">
            {loading ? (
              <Skeleton className="h-8 w-48" />
            ) : token ? (
              <>
                {token.logoURI && (
                  <img
                    src={token.logoURI}
                    alt={token.symbol}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full"
                  />
                )}
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-bold text-sm sm:text-base">{token.symbol}</span>
                    <span className="text-muted-foreground text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
                      {token.name}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs ${isWatched ? "text-primary" : "text-muted-foreground"}`}
                  onClick={() => {
                    if (!token || !poolData) return;
                    if (isWatched) {
                      removeFromWatchlist(mint);
                      toast.success(`Removed ${token.symbol} from watchlist`);
                    } else {
                      addToWatchlist(token, poolData.pairAddress);
                      toast.success(`Added ${token.symbol} to watchlist`);
                    }
                  }}
                >
                  {isWatched ? (
                    <EyeOff className="mr-1 h-3.5 w-3.5" />
                  ) : (
                    <Eye className="mr-1 h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{isWatched ? "Unwatch" : "Watch"}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={copyAddress}
                  title="Copy contract address"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-positive" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <div className="ml-auto flex items-center gap-2 sm:gap-4 text-sm">
                  {price !== null && (
                    <span className="font-mono font-semibold text-xs sm:text-sm">
                      ${price < 0.01 ? price.toExponential(2) : price.toFixed(4)}
                    </span>
                  )}
                  {poolData?.priceChange?.h24 !== undefined && (
                    <span
                      className={`font-mono text-xs ${
                        poolData.priceChange.h24 >= 0
                          ? "text-positive"
                          : "text-destructive"
                      }`}
                    >
                      {poolData.priceChange.h24 >= 0 ? "+" : ""}
                      {poolData.priceChange.h24.toFixed(1)}%
                    </span>
                  )}
                  {poolData?.volume?.h24 && (
                    <span className="text-muted-foreground text-xs hidden sm:inline">
                      Vol ${(poolData.volume.h24 / 1e6).toFixed(1)}M
                    </span>
                  )}
                  {poolData?.liquidity?.usd && (
                    <span className="text-muted-foreground text-xs hidden sm:inline">
                      Liq ${(poolData.liquidity.usd / 1e6).toFixed(1)}M
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-muted-foreground text-sm">
                Token not found
              </span>
            )}
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-[250px] md:min-h-[400px]">
            <ChartContainer pairAddress={poolData?.pairAddress ?? null} />
          </div>
        </div>

        {/* Swap Panel */}
        <div className="w-full lg:w-[340px] shrink-0">
          <SwapPanel defaultOutputToken={token ?? undefined} marketCap={poolData?.marketCap ?? null} />
        </div>
      </div>

      {/* Bottom: Positions + Calculator */}
      <div className="p-2 sm:p-4 pt-3 gap-4 flex flex-col lg:flex-row">
        <div className="flex-1 min-w-0">
          <Card>
            <div className="px-4 pt-3 pb-1">
              <h2 className="text-sm font-semibold text-muted-foreground">Positions</h2>
            </div>
            <PositionsTable compact />
          </Card>
        </div>
        <div className="w-full lg:w-[340px] shrink-0">
          {token && <InstantTradePopup token={token} price={price} />}
          <PositionSizeCalculator
            tokenSymbol={token?.symbol ?? null}
            tokenPrice={price}
            marketCap={poolData?.marketCap ?? null}
          />
        </div>
      </div>
    </div>
  );
}
