"use client";

import { useRef, useState } from "react";
import { Download, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TokenPnL } from "@/types";

interface TradeCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TokenPnL | null;
}

function fmtPnl(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function TradeCardDialog({ open, onOpenChange, data }: TradeCardDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!data) return null;

  const isPositive = data.totalPnlUsd >= 0;

  const copyText = () => {
    const text = `I paper traded $${data.token.symbol} ${fmtPct(data.totalPnlPct)} (${fmtPnl(data.totalPnlUsd)}) on Paper Terminal\n\nInvested: $${data.totalBoughtUsd.toFixed(2)} | ${data.totalBuys}B/${data.totalSells}S | ${data.status.toUpperCase()}\n\nsolana-paper-trader.vercel.app`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    });
  };

  const downloadImage = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#09090b",
        scale: 2,
        ignoreElements: (el) => el.tagName === "IMG",
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `paper-trade-${data.token.symbol}.png`;
      a.click();
      toast.success("Image downloaded");
    } catch {
      toast.error("Failed to generate image");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Share Trade</DialogTitle>
          <DialogDescription>Share your paper trade results</DialogDescription>
        </DialogHeader>

        {/* The card to capture */}
        <div
          ref={cardRef}
          className="p-5 space-y-4"
          style={{ background: "#09090b" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs font-black">
                P
              </div>
              <span className="text-xs text-muted-foreground font-medium">Paper Terminal</span>
            </div>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                data.status === "open"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {data.status.toUpperCase()}
            </span>
          </div>

          {/* Token + Hero Line */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                {data.token.symbol.charAt(0)}
              </div>
              <span className="font-bold text-lg">{data.token.symbol}</span>
            </div>
            <div
              className={`font-mono text-3xl font-black ${
                isPositive ? "text-positive" : "text-destructive"
              }`}
            >
              {fmtPct(data.totalPnlPct)}
            </div>
            <div className="text-sm text-muted-foreground">
              I paper traded <span className="font-semibold text-foreground">${data.token.symbol}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Total P&L</div>
              <div className={`font-mono text-sm font-bold ${isPositive ? "text-positive" : "text-destructive"}`}>
                {fmtPnl(data.totalPnlUsd)}
              </div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Invested</div>
              <div className="font-mono text-sm font-bold">${data.totalBoughtUsd.toFixed(2)}</div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Realized</div>
              <div className={`font-mono text-sm font-bold ${data.realizedPnlUsd >= 0 ? "text-positive" : "text-destructive"}`}>
                {fmtPnl(data.realizedPnlUsd)}
              </div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Trades</div>
              <div className="font-mono text-sm font-bold">
                <span className="text-positive">{data.totalBuys}B</span>
                {" / "}
                <span className="text-destructive">{data.totalSells}S</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
            <span>{fmtDate(data.firstTradeAt)}{data.lastTradeAt !== data.firstTradeAt ? ` → ${fmtDate(data.lastTradeAt)}` : ""}</span>
            <span className="font-mono">solana-paper-trader.vercel.app</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 px-5 pb-4">
          <Button variant="outline" className="flex-1" onClick={copyText}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy Text
          </Button>
          <Button className="flex-1" onClick={downloadImage} disabled={downloading}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {downloading ? "Saving..." : "Save Image"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
