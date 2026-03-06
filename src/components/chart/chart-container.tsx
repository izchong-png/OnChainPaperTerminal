"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface ChartContainerProps {
  pairAddress: string | null;
}

export function ChartContainer({ pairAddress }: ChartContainerProps) {
  if (!pairAddress) {
    return (
      <div className="flex h-full min-h-[250px] md:min-h-[400px] items-center justify-center border border-border rounded-lg bg-card">
        <span className="text-muted-foreground text-sm">No chart data available</span>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[250px] md:min-h-[400px] border border-border rounded-lg bg-card overflow-hidden">
      <iframe
        src={`https://dexscreener.com/solana/${pairAddress}?embed=1&theme=dark&info=0&trades=0`}
        className="w-full h-full border-0"
        style={{ minHeight: "inherit" }}
        allow="clipboard-write"
        loading="lazy"
      />
    </div>
  );
}
