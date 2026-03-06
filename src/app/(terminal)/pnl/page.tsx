"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, isSameDay } from "date-fns";
import { CalendarDays, BookOpen, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useHydration } from "@/hooks/use-hydration";
import { usePnLData, type DailyPnL } from "@/hooks/use-pnl";
import { useJournalStore } from "@/stores/journal-store";
import { TradeCardDialog } from "@/components/share/trade-card";
import { TokenPnL } from "@/types";

function safe(n: number): number {
  return isFinite(n) ? n : 0;
}

function fmtPnl(n: number): string {
  const v = safe(n);
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

function fmtDate(ts: number): string {
  return format(ts, "MMM d");
}

type FilterTab = "all" | "open" | "closed";

function PnLCalendar({ dailyPnL }: { dailyPnL: Map<string, DailyPnL> }) {
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);

  // Dates that have trades
  const tradeDates = useMemo(() => {
    const dates: Date[] = [];
    for (const [dateStr] of dailyPnL) {
      dates.push(new Date(dateStr + "T00:00:00"));
    }
    return dates;
  }, [dailyPnL]);

  // Selected day's P&L
  const selectedDayPnL = useMemo(() => {
    if (!selectedDay) return null;
    const key = format(selectedDay, "yyyy-MM-dd");
    return dailyPnL.get(key) ?? null;
  }, [selectedDay, dailyPnL]);

  // Monthly total
  const monthTotal = useMemo(() => {
    const monthKey = format(month, "yyyy-MM");
    let realized = 0;
    let trades = 0;
    for (const [dateStr, day] of dailyPnL) {
      if (dateStr.startsWith(monthKey)) {
        realized += day.realized;
        trades += day.trades;
      }
    }
    return { realized: safe(realized), trades };
  }, [month, dailyPnL]);

  return (
    <div className="space-y-3">
      <Calendar
        mode="single"
        selected={selectedDay}
        onSelect={setSelectedDay}
        month={month}
        onMonthChange={setMonth}
        modifiers={{ hasTradeDay: tradeDates }}
        modifiersClassNames={{
          hasTradeDay: "ring-1 ring-primary/50 rounded-md",
        }}
        components={{
          DayButton: ({ day, modifiers, ...props }) => {
            const dateKey = format(day.date, "yyyy-MM-dd");
            const dayData = dailyPnL.get(dateKey);

            return (
              <button
                {...props}
                className={`flex aspect-square w-full min-w-(--cell-size) flex-col items-center justify-center gap-0.5 rounded-md text-sm hover:bg-accent ${
                  modifiers.selected
                    ? "bg-primary text-primary-foreground"
                    : modifiers.today
                      ? "bg-accent text-accent-foreground"
                      : modifiers.outside
                        ? "text-muted-foreground opacity-50"
                        : ""
                }`}
              >
                <span>{day.date.getDate()}</span>
                {dayData && !modifiers.outside && (
                  <span
                    className={`text-[8px] font-mono leading-none ${
                      modifiers.selected
                        ? "text-primary-foreground/80"
                        : dayData.realized >= 0
                          ? "text-positive"
                          : "text-destructive"
                    }`}
                  >
                    {dayData.realized >= 0 ? "+" : "-"}$
                    {Math.abs(dayData.realized) >= 1000
                      ? `${(Math.abs(dayData.realized) / 1000).toFixed(1)}k`
                      : Math.abs(dayData.realized).toFixed(0)}
                  </span>
                )}
              </button>
            );
          },
        }}
      />

      {/* Selected day detail */}
      {selectedDayPnL && selectedDay && (
        <div className="border-t border-border pt-2 px-1 space-y-1">
          <div className="text-xs font-medium">
            {format(selectedDay, "MMMM d, yyyy")}
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Trades</span>
            <span className="font-mono">{selectedDayPnL.trades}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Realized P&L</span>
            <span
              className={`font-mono font-semibold ${
                selectedDayPnL.realized >= 0
                  ? "text-positive"
                  : "text-destructive"
              }`}
            >
              {fmtPnl(selectedDayPnL.realized)}
            </span>
          </div>
        </div>
      )}

      {/* Monthly total */}
      <div className="border-t border-border pt-2 px-1 space-y-1">
        <div className="text-xs font-medium">
          {format(month, "MMMM yyyy")} Summary
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Trades</span>
          <span className="font-mono">{monthTotal.trades}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Realized P&L</span>
          <span
            className={`font-mono font-semibold ${
              monthTotal.realized >= 0 ? "text-positive" : "text-destructive"
            }`}
          >
            {fmtPnl(monthTotal.realized)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PnLPage() {
  const hydrated = useHydration();
  const { pnlData, totals, dailyPnL, pricesLoading } = usePnLData();
  const [filter, setFilter] = useState<FilterTab>("all");

  const journalEntries = useJournalStore((s) => s.entries);
  const setJournalEntry = useJournalStore((s) => s.setEntry);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalMint, setJournalMint] = useState<string | null>(null);
  const [journalSymbol, setJournalSymbol] = useState("");
  const [journalDraft, setJournalDraft] = useState("");

  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState<TokenPnL | null>(null);

  const openJournal = (mint: string, symbol: string) => {
    setJournalMint(mint);
    setJournalSymbol(symbol);
    setJournalDraft(journalEntries[mint]?.text ?? "");
    setJournalOpen(true);
  };

  const saveJournal = () => {
    if (journalMint) {
      setJournalEntry(journalMint, journalDraft);
    }
    setJournalOpen(false);
  };

  const filtered = useMemo(() => {
    if (filter === "all") return pnlData;
    return pnlData.filter((p) => p.status === filter);
  }, [pnlData, filter]);

  if (!hydrated) {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-lg">Profit & Loss</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {pnlData.length} token{pnlData.length !== 1 ? "s" : ""} traded
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7">
                <CalendarDays className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              <PnLCalendar dailyPnL={dailyPnL} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1">Total P&L</div>
            <div
              className={`font-mono text-xl font-bold ${
                totals.totalCombined >= 0 ? "text-positive" : "text-destructive"
              }`}
            >
              {fmtPnl(totals.totalCombined)}
            </div>
            {totals.totalInvested > 0 && (
              <div
                className={`text-xs font-mono ${
                  totals.totalReturnPct >= 0 ? "text-positive" : "text-destructive"
                }`}
              >
                {totals.totalReturnPct >= 0 ? "+" : ""}
                {totals.totalReturnPct.toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1">Realized</div>
            <div
              className={`font-mono text-xl font-bold ${
                totals.totalRealized >= 0 ? "text-positive" : "text-destructive"
              }`}
            >
              {fmtPnl(totals.totalRealized)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1">Unrealized</div>
            <div
              className={`font-mono text-xl font-bold ${
                totals.totalUnrealized >= 0 ? "text-positive" : "text-destructive"
              }`}
            >
              {fmtPnl(totals.totalUnrealized)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
            <div className="font-mono text-xl font-bold">
              {totals.tokenCount > 0 ? `${totals.winRate.toFixed(0)}%` : "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="text-positive">{totals.winningTokens}W</span>
              {" / "}
              <span className="text-destructive">{totals.losingTokens}L</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">All ({pnlData.length})</TabsTrigger>
          <TabsTrigger value="open">
            Open ({pnlData.filter((p) => p.status === "open").length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({pnlData.filter((p) => p.status === "closed").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Per-Token P&L Table */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">
            {pnlData.length === 0
              ? "No trades yet. Start trading to see your P&L here."
              : "No tokens match this filter."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-right">Trades</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Realized</TableHead>
                <TableHead className="text-right">Unrealized</TableHead>
                <TableHead className="text-right">Total P&L</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center w-10">Journal</TableHead>
                <TableHead className="text-center w-10">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.mint} className="hover:bg-accent">
                  <TableCell className="py-2.5">
                    <Link
                      href={`/trade/${row.mint}`}
                      className="flex items-center gap-2"
                    >
                      {row.token.logoURI ? (
                        <img
                          src={row.token.logoURI}
                          alt={row.token.symbol}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold">
                          {row.token.symbol.charAt(0)}
                        </div>
                      )}
                      <span className="font-semibold text-sm">
                        {row.token.symbol}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                    {row.status === "closed" ? (
                      isSameDay(row.firstTradeAt, row.lastTradeAt) ? (
                        <span>{fmtDate(row.firstTradeAt)}</span>
                      ) : (
                        <span>
                          {fmtDate(row.firstTradeAt)}{" "}
                          <span className="text-muted-foreground/60">&rarr;</span>{" "}
                          {fmtDate(row.lastTradeAt)}
                        </span>
                      )
                    ) : (
                      <span>{fmtDate(row.firstTradeAt)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground py-2.5">
                    <span className="text-positive">{row.totalBuys}B</span>
                    {" / "}
                    <span className="text-destructive">{row.totalSells}S</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm py-2.5">
                    ${row.totalBoughtUsd.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right py-2.5">
                    <span
                      className={`font-mono text-sm ${
                        row.realizedPnlUsd >= 0
                          ? "text-positive"
                          : "text-destructive"
                      }`}
                    >
                      {fmtPnl(row.realizedPnlUsd)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-2.5">
                    {row.status === "closed" ? (
                      <span className="text-sm text-muted-foreground">-</span>
                    ) : pricesLoading && row.currentPrice === 0 ? (
                      <Skeleton className="h-4 w-16 ml-auto" />
                    ) : (
                      <div>
                        <span
                          className={`font-mono text-sm ${
                            row.unrealizedPnlUsd >= 0
                              ? "text-positive"
                              : "text-destructive"
                          }`}
                        >
                          {fmtPnl(row.unrealizedPnlUsd)}
                        </span>
                        <div
                          className={`font-mono text-xs ${
                            row.unrealizedPnlPct >= 0
                              ? "text-positive"
                              : "text-destructive"
                          }`}
                        >
                          {row.unrealizedPnlPct >= 0 ? "+" : ""}
                          {row.unrealizedPnlPct.toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-2.5">
                    <div>
                      <span
                        className={`font-mono text-sm font-semibold ${
                          row.totalPnlUsd >= 0
                            ? "text-positive"
                            : "text-destructive"
                        }`}
                      >
                        {fmtPnl(row.totalPnlUsd)}
                      </span>
                      <div
                        className={`font-mono text-xs ${
                          row.totalPnlPct >= 0
                            ? "text-positive"
                            : "text-destructive"
                        }`}
                      >
                        {row.totalPnlPct >= 0 ? "+" : ""}
                        {row.totalPnlPct.toFixed(1)}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-2.5">
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        row.status === "open"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.status === "open" ? "OPEN" : "CLOSED"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-2.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${
                        journalEntries[row.mint]?.text
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                      onClick={() => openJournal(row.mint, row.token.symbol)}
                      title={
                        journalEntries[row.mint]?.text
                          ? "Edit journal"
                          : "Add journal"
                      }
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center py-2.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => {
                        setShareData(row);
                        setShareOpen(true);
                      }}
                      title="Share trade card"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={journalOpen} onOpenChange={setJournalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Journal — {journalSymbol}</DialogTitle>
            <DialogDescription>
              Notes for this position (max 300 characters).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={journalDraft}
              onChange={(e) => {
                if (e.target.value.length <= 300) {
                  setJournalDraft(e.target.value);
                }
              }}
              placeholder="Why did you enter this trade? What's your thesis?"
              className="min-h-[120px] resize-none font-mono text-sm"
              maxLength={300}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {journalDraft.length}/300
              </span>
              <Button size="sm" onClick={saveJournal}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TradeCardDialog open={shareOpen} onOpenChange={setShareOpen} data={shareData} />
    </div>
  );
}
