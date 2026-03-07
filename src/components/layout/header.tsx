"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, BarChart3, History, Wallet, Plus, Eye, TrendingUp, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TokenSearchDialog } from "@/components/search/token-search-dialog";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useHydration } from "@/hooks/use-hydration";
import { SOL_MINT } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { OwlLogo } from "@/components/ui/owl-logo";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [addSolOpen, setAddSolOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solAmount, setSolAmount] = useState("10");
  const hydrated = useHydration();
  const solBalance = usePortfolioStore((s) => s.balances[SOL_MINT]?.amount ?? 0);
  const addSol = usePortfolioStore((s) => s.addSol);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-12 items-center gap-2 sm:gap-4 px-3 sm:px-4">
          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden shrink-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          <Link href="/" className="flex items-center gap-1.5 font-bold text-sm shrink-0">
            <OwlLogo size={26} />
            <span className="hidden sm:inline">PaperTerminal</span>
          </Link>

          <Button
            variant="outline"
            className="flex-1 max-w-sm justify-start text-muted-foreground text-sm h-8"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="mr-2 h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Search tokens...</span>
            <kbd className="ml-auto hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
              <Link href="/portfolio">
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                Portfolio
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
              <Link href="/pnl">
                <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                P&L
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
              <Link href="/history">
                <History className="mr-1.5 h-3.5 w-3.5" />
                History
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
              <Link href="/watchlist">
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Watchlist
              </Link>
            </Button>
          </nav>

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <div className="flex items-center gap-1.5 bg-secondary rounded-md px-2 sm:px-2.5 py-1">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              {hydrated ? (
                <span className="font-mono text-xs font-medium">
                  <span className="hidden sm:inline">{solBalance.toFixed(4)}</span>
                  <span className="sm:hidden">{solBalance.toFixed(2)}</span>
                  {" "}SOL
                </span>
              ) : (
                <Skeleton className="h-3 w-16" />
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setAddSolOpen(true)}
              title="Add SOL"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-3 py-2 space-y-1">
            <Button variant="ghost" size="sm" className="w-full justify-start h-9 text-sm" asChild onClick={() => setMobileMenuOpen(false)}>
              <Link href="/portfolio">
                <BarChart3 className="mr-2 h-4 w-4" />
                Portfolio
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start h-9 text-sm" asChild onClick={() => setMobileMenuOpen(false)}>
              <Link href="/pnl">
                <TrendingUp className="mr-2 h-4 w-4" />
                P&L
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start h-9 text-sm" asChild onClick={() => setMobileMenuOpen(false)}>
              <Link href="/history">
                <History className="mr-2 h-4 w-4" />
                History
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start h-9 text-sm" asChild onClick={() => setMobileMenuOpen(false)}>
              <Link href="/watchlist">
                <Eye className="mr-2 h-4 w-4" />
                Watchlist
              </Link>
            </Button>
          </div>
        )}
      </header>

      <TokenSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      <Dialog open={addSolOpen} onOpenChange={setAddSolOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add SOL</DialogTitle>
            <DialogDescription>
              Top up your paper trading balance.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const amount = parseFloat(solAmount);
              if (amount > 0) {
                addSol(amount);
                toast.success(`Added ${amount} SOL to your balance`);
                setAddSolOpen(false);
                setSolAmount("10");
              }
            }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0.01"
                step="any"
                value={solAmount}
                onChange={(e) => setSolAmount(e.target.value)}
                className="font-mono"
                autoFocus
              />
              <span className="text-sm font-medium text-muted-foreground">SOL</span>
            </div>
            <div className="flex gap-1.5">
              {[1, 5, 10, 50, 100].map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-7"
                  onClick={() => setSolAmount(n.toString())}
                >
                  {n}
                </Button>
              ))}
            </div>
            <Button type="submit" className="w-full">
              Add SOL
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
