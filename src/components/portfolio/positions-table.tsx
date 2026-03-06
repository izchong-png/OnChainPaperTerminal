"use client";

import { memo, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { BookOpen, ShieldAlert, Target, X, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useJournalStore } from "@/stores/journal-store";
import { useOrdersStore } from "@/stores/orders-store";
import { useTokenPrices } from "@/hooks/use-token-price";
import { useHydration } from "@/hooks/use-hydration";
import { SOL_MINT } from "@/lib/constants";
import { Position } from "@/types";

function safe(n: number): number {
  return isFinite(n) ? n : 0;
}

function fmtUsd(n: number): string {
  const v = safe(n);
  if (v === 0) return "$0.00";
  if (Math.abs(v) >= 1) return `$${v.toFixed(2)}`;
  if (Math.abs(v) >= 0.01) return `$${v.toFixed(4)}`;
  if (Math.abs(v) >= 0.0001) return `$${v.toFixed(6)}`;
  return `$${v.toExponential(2)}`;
}

function fmtAmount(n: number): string {
  const v = safe(n);
  if (v === 0) return "0";
  if (v >= 1_000_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(4);
  if (v >= 0.0001) return v.toFixed(6);
  return v.toExponential(2);
}

function fmtMcap(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}

const MAX_CHARS = 300;

interface PositionRowProps {
  pos: Position;
  compact?: boolean;
  pricesLoading: boolean;
  hasJournal: boolean;
  hasOrders: boolean;
  onOpenSlTp: (mint: string, symbol: string) => void;
  onOpenJournal: (mint: string, symbol: string) => void;
}

const PositionRow = memo(function PositionRow({
  pos,
  compact,
  pricesLoading,
  hasJournal,
  hasOrders,
  onOpenSlTp,
  onOpenJournal,
}: PositionRowProps) {
  return (
    <TableRow className="cursor-pointer hover:bg-accent">
      <TableCell className="py-2">
        <Link
          href={`/trade/${pos.token.mint}`}
          className="flex items-center gap-2"
        >
          {pos.token.logoURI ? (
            <img
              src={pos.token.logoURI}
              alt={pos.token.symbol}
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold">
              {pos.token.symbol.charAt(0)}
            </div>
          )}
          <span className="font-semibold text-sm">
            {pos.token.symbol}
          </span>
        </Link>
      </TableCell>
      <TableCell className="text-right font-mono text-sm py-2">
        {fmtAmount(pos.amount)}
      </TableCell>
      {!compact && (
        <TableCell className="text-right font-mono text-sm py-2">
          {pos.costBasisPerToken > 0 ? fmtUsd(pos.costBasisPerToken) : "-"}
        </TableCell>
      )}
      <TableCell className="text-right font-mono text-sm py-2">
        {pricesLoading && pos.currentPriceUsd === 0 ? (
          <Skeleton className="h-4 w-16 ml-auto" />
        ) : pos.currentPriceUsd > 0 ? (
          fmtUsd(pos.currentPriceUsd)
        ) : (
          "-"
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-sm py-2">
        ${safe(pos.currentValueUsd).toFixed(2)}
      </TableCell>
      <TableCell className="text-right py-2">
        {pos.token.mint === SOL_MINT || pos.costBasisUsd === 0 ? (
          <span className="text-muted-foreground text-sm">-</span>
        ) : (
          <div>
            <div
              className={`font-mono text-sm ${
                pos.unrealizedPnlUsd >= 0
                  ? "text-positive"
                  : "text-destructive"
              }`}
            >
              {pos.unrealizedPnlUsd >= 0 ? "+" : "-"}$
              {safe(Math.abs(pos.unrealizedPnlUsd)).toFixed(2)}
            </div>
            <div
              className={`font-mono text-xs ${
                pos.unrealizedPnlPct >= 0
                  ? "text-positive"
                  : "text-destructive"
              }`}
            >
              {pos.unrealizedPnlPct >= 0 ? "+" : ""}
              {safe(pos.unrealizedPnlPct).toFixed(1)}%
            </div>
          </div>
        )}
      </TableCell>
      <TableCell className="text-center py-2">
        {pos.token.mint !== SOL_MINT && (
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${hasOrders ? "text-primary" : "text-muted-foreground"}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenSlTp(pos.token.mint, pos.token.symbol);
            }}
            title="Set stop loss / take profit"
          >
            <Target className="h-3.5 w-3.5" />
          </Button>
        )}
      </TableCell>
      <TableCell className="text-center py-2">
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${hasJournal ? "text-primary" : "text-muted-foreground"}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpenJournal(pos.token.mint, pos.token.symbol);
          }}
          title={hasJournal ? "Edit journal" : "Add journal"}
        >
          <BookOpen className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

interface PositionsTableProps {
  compact?: boolean;
}

export function PositionsTable({ compact }: PositionsTableProps) {
  const hydrated = useHydration();
  const balances = usePortfolioStore((s) => s.balances);
  const holdingMints = useMemo(() => Object.keys(balances), [balances]);
  const { prices, marketCaps, loading: pricesLoading } = useTokenPrices(holdingMints);

  const journalEntries = useJournalStore((s) => s.entries);
  const setJournalEntry = useJournalStore((s) => s.setEntry);

  const addOrder = useOrdersStore((s) => s.addOrder);
  const removeOrder = useOrdersStore((s) => s.removeOrder);
  const allOrders = useOrdersStore((s) => s.orders);

  const [journalOpen, setJournalOpen] = useState(false);
  const [journalMint, setJournalMint] = useState<string | null>(null);
  const [journalSymbol, setJournalSymbol] = useState("");
  const [journalDraft, setJournalDraft] = useState("");

  // SL/TP dialog state
  const [slTpOpen, setSlTpOpen] = useState(false);
  const [slTpMint, setSlTpMint] = useState<string | null>(null);
  const [slTpSymbol, setSlTpSymbol] = useState("");
  const [slInput, setSlInput] = useState("");
  const [tpInput, setTpInput] = useState("");

  const openSlTp = useCallback((mint: string, symbol: string) => {
    setSlTpMint(mint);
    setSlTpSymbol(symbol);
    setSlInput("");
    setTpInput("");
    setSlTpOpen(true);
  }, []);

  const slTpMcap = slTpMint ? marketCaps[slTpMint] ?? 0 : 0;
  const slTpBalance = slTpMint ? balances[slTpMint]?.amount ?? 0 : 0;
  const slTpToken = slTpMint ? balances[slTpMint]?.token ?? null : null;

  const handleSetSlFromDialog = () => {
    if (!slTpMint || !slTpToken || slTpMcap <= 0) return;
    const trigger = parseFloat(slInput);
    if (!trigger || trigger <= 0) { toast.error("Enter a valid market cap"); return; }
    if (trigger >= slTpMcap) { toast.error("SL must be below current MC"); return; }
    addOrder({ mint: slTpMint, token: slTpToken, type: "stop_loss", triggerMcap: trigger, amount: slTpBalance });
    toast.success(`Stop loss set for ${slTpSymbol} at MC $${fmtMcap(trigger)}`);
    setSlInput("");
  };

  const handleSetTpFromDialog = () => {
    if (!slTpMint || !slTpToken || slTpMcap <= 0) return;
    const trigger = parseFloat(tpInput);
    if (!trigger || trigger <= 0) { toast.error("Enter a valid market cap"); return; }
    if (trigger <= slTpMcap) { toast.error("TP must be above current MC"); return; }
    addOrder({ mint: slTpMint, token: slTpToken, type: "take_profit", triggerMcap: trigger, amount: slTpBalance });
    toast.success(`Take profit set for ${slTpSymbol} at MC $${fmtMcap(trigger)}`);
    setTpInput("");
  };

  const openJournal = useCallback((mint: string, symbol: string) => {
    setJournalMint(mint);
    setJournalSymbol(symbol);
    setJournalDraft(journalEntries[mint]?.text ?? "");
    setJournalOpen(true);
  }, [journalEntries]);

  const saveJournal = () => {
    if (journalMint) {
      setJournalEntry(journalMint, journalDraft);
    }
    setJournalOpen(false);
  };

  const positions: Position[] = useMemo(() => {
    return Object.entries(balances)
      .map(([mint, bal]) => {
        const currentPrice = prices[mint] ?? 0;
        const currentValue = bal.amount * currentPrice;
        const unrealizedPnl = bal.costBasisUsd > 0 ? currentValue - bal.costBasisUsd : 0;
        const unrealizedPnlPct =
          bal.costBasisUsd > 0 ? (unrealizedPnl / bal.costBasisUsd) * 100 : 0;

        return {
          ...bal,
          currentPriceUsd: currentPrice,
          currentValueUsd: safe(currentValue),
          unrealizedPnlUsd: safe(unrealizedPnl),
          unrealizedPnlPct: safe(unrealizedPnlPct),
        };
      })
      .sort((a, b) => b.currentValueUsd - a.currentValueUsd);
  }, [balances, prices]);

  if (!hydrated) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (positions.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-6">
        No positions yet.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {!compact && <TableHead className="text-right">Avg Entry</TableHead>}
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">PnL</TableHead>
            <TableHead className="text-center w-10">SL/TP</TableHead>
            <TableHead className="text-center w-10">Journal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((pos) => (
            <PositionRow
              key={pos.token.mint}
              pos={pos}
              compact={compact}
              pricesLoading={pricesLoading}
              hasJournal={!!journalEntries[pos.token.mint]?.text}
              hasOrders={allOrders.some((o) => o.mint === pos.token.mint)}
              onOpenSlTp={openSlTp}
              onOpenJournal={openJournal}
            />
          ))}
        </TableBody>
      </Table>
      </div>

      <Dialog open={journalOpen} onOpenChange={setJournalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Journal — {journalSymbol}</DialogTitle>
            <DialogDescription>
              Notes for this position (max {MAX_CHARS} characters).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={journalDraft}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setJournalDraft(e.target.value);
                }
              }}
              placeholder="Why did you enter this trade? What's your thesis?"
              className="min-h-[120px] resize-none font-mono text-sm"
              maxLength={MAX_CHARS}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {journalDraft.length}/{MAX_CHARS}
              </span>
              <Button size="sm" onClick={saveJournal}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SL/TP Dialog */}
      <Dialog open={slTpOpen} onOpenChange={setSlTpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>SL / TP — {slTpSymbol}</DialogTitle>
            <DialogDescription>
              {slTpMcap > 0
                ? `Current MC: $${fmtMcap(slTpMcap)}`
                : "Market cap loading..."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Stop Loss */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-3 w-3 text-destructive" />
                <span className="text-xs font-medium">Stop Loss (Market Cap)</span>
              </div>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder={slTpMcap > 0 ? fmtMcap(slTpMcap * 0.9) : "0"}
                    value={slInput}
                    onChange={(e) => setSlInput(e.target.value)}
                    className="font-mono text-sm h-8 pl-5"
                    step="any"
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs px-3"
                  onClick={handleSetSlFromDialog}
                  disabled={!slInput || parseFloat(slInput) <= 0 || slTpMcap <= 0}
                >
                  Set SL
                </Button>
              </div>
              <div className="flex gap-1">
                {[5, 10, 15, 25].map((pct) => (
                  <Button
                    key={pct}
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] px-1.5"
                    onClick={() => setSlInput(Math.round(slTpMcap * (1 - pct / 100)).toString())}
                    disabled={slTpMcap <= 0}
                  >
                    -{pct}%
                  </Button>
                ))}
              </div>
            </div>

            {/* Take Profit */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Target className="h-3 w-3 text-positive" />
                <span className="text-xs font-medium">Take Profit (Market Cap)</span>
              </div>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder={slTpMcap > 0 ? fmtMcap(slTpMcap * 1.5) : "0"}
                    value={tpInput}
                    onChange={(e) => setTpInput(e.target.value)}
                    className="font-mono text-sm h-8 pl-5"
                    step="any"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs px-3 bg-positive text-positive-foreground hover:bg-positive/90"
                  onClick={handleSetTpFromDialog}
                  disabled={!tpInput || parseFloat(tpInput) <= 0 || slTpMcap <= 0}
                >
                  Set TP
                </Button>
              </div>
              <div className="flex gap-1">
                {[10, 25, 50, 100].map((pct) => (
                  <Button
                    key={pct}
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] px-1.5"
                    onClick={() => setTpInput(Math.round(slTpMcap * (1 + pct / 100)).toString())}
                    disabled={slTpMcap <= 0}
                  >
                    +{pct}%
                  </Button>
                ))}
              </div>
            </div>

            {/* Active orders for this token */}
            {slTpMint && allOrders.filter((o) => o.mint === slTpMint).length > 0 && (
              <div className="border-t border-border pt-2 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Active Orders
                </span>
                {allOrders
                  .filter((o) => o.mint === slTpMint)
                  .map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        {order.type === "stop_loss" ? (
                          <ShieldAlert className="h-3 w-3 text-destructive" />
                        ) : order.type === "take_profit" ? (
                          <Target className="h-3 w-3 text-positive" />
                        ) : (
                          <Clock className="h-3 w-3 text-primary" />
                        )}
                        <span>
                          {order.type === "stop_loss"
                            ? "SL"
                            : order.type === "take_profit"
                              ? "TP"
                              : order.type === "limit_buy"
                                ? "Limit Buy"
                                : "Limit Sell"}
                        </span>
                        <span className="font-mono">
                          {order.triggerMcap
                            ? `MC $${fmtMcap(order.triggerMcap)}`
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-mono">
                          {fmtAmount(order.amount)} {slTpSymbol}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            removeOrder(order.id);
                            toast.success("Order removed");
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
