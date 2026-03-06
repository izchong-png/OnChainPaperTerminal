"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTokenSearch } from "@/hooks/use-token-search";
import { useSearchHistoryStore } from "@/stores/search-history-store";
import { SearchResult } from "@/types";

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "-";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatPrice(p: number): string {
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  if (p >= 0.0001) return `$${p.toFixed(6)}`;
  return `$${p.toExponential(2)}`;
}

interface TokenSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (result: SearchResult) => void;
}

export function TokenSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: TokenSearchDialogProps) {
  const [query, setQuery] = useState("");
  const { results, loading } = useTokenSearch(query);
  const router = useRouter();
  const recentTokens = useSearchHistoryStore((s) => s.recentTokens);
  const addRecent = useSearchHistoryStore((s) => s.addRecent);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const handleSelect = (result: SearchResult) => {
    addRecent(result);
    onOpenChange(false);
    if (onSelect) {
      onSelect(result);
    } else {
      router.push(`/trade/${result.token.mint}`);
    }
  };

  const showRecent = query.length < 2 && recentTokens.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Search tokens</DialogTitle>
        <DialogDescription>Search for Solana tokens to trade</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
        <Command shouldFilter={false} className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput
            placeholder="Search tokens (e.g. BONK, SOL, JUP)..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {!showRecent && (
              <CommandEmpty>
                {loading ? "Searching..." : query.length < 2 ? "Type to search..." : "No tokens found."}
              </CommandEmpty>
            )}
            {showRecent && (
              <CommandGroup heading="Recent">
                {recentTokens.map((result) => (
                  <CommandItem
                    key={`recent-${result.token.mint}`}
                    value={`recent-${result.token.symbol}-${result.token.mint}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    {result.token.logoURI ? (
                      <img
                        src={result.token.logoURI}
                        alt={result.token.symbol}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                        {result.token.symbol.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {result.token.symbol}
                        </span>
                        <span className="text-muted-foreground text-xs truncate">
                          {result.token.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {formatPrice(result.priceUsd)}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.length > 0 && (
              <CommandGroup heading="Tokens">
                {results.map((result) => (
                  <CommandItem
                    key={`${result.token.mint}-${result.pairAddress}`}
                    value={`${result.token.symbol}-${result.pairAddress}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    {result.token.logoURI ? (
                      <img
                        src={result.token.logoURI}
                        alt={result.token.symbol}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                        {result.token.symbol.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {result.token.symbol}
                        </span>
                        <span className="text-muted-foreground text-xs truncate">
                          {result.token.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Vol {formatNumber(result.volume24h)}</span>
                        <span>Liq {formatNumber(result.liquidity)}</span>
                        <span className="text-[10px] uppercase">{result.dexId}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {formatPrice(result.priceUsd)}
                      </div>
                      {result.priceChange24h !== null && (
                        <div
                          className={`text-xs font-mono ${
                            result.priceChange24h >= 0
                              ? "text-positive"
                              : "text-destructive"
                          }`}
                        >
                          {result.priceChange24h >= 0 ? "+" : ""}
                          {result.priceChange24h.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
