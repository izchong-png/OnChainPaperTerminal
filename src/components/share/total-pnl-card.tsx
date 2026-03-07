"use client";

import { useState } from "react";
import { Download, Copy, ImageIcon } from "lucide-react";
import { OwlLogo } from "@/components/ui/owl-logo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface TotalPnLTotals {
  totalRealized: number;
  totalUnrealized: number;
  totalCombined: number;
  totalInvested: number;
  totalReturnPct: number;
  tokenCount: number;
  winningTokens: number;
  losingTokens: number;
  winRate: number;
}

interface TotalPnLShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totals: TotalPnLTotals;
  tokenCount: number;
}

function fmtPnl(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

const C = {
  bg: "#09090b",
  fg: "#e4e4e7",
  muted: "#a1a1aa",
  positive: "#4ade80",
  destructive: "#f87171",
  primary: "#4ade80",
  primaryBg: "rgba(74, 222, 128, 0.15)",
  cardBg: "#1c1c20",
  border: "#27272a",
};

function drawOwl(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.fillStyle = "#4ade80";
  ctx.beginPath();
  ctx.moveTo(x + 5 * s, y + 8 * s);
  ctx.lineTo(x + 3.5 * s, y + 2.5 * s);
  ctx.lineTo(x + 9 * s, y + 6.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 19 * s, y + 8 * s);
  ctx.lineTo(x + 20.5 * s, y + 2.5 * s);
  ctx.lineTo(x + 15 * s, y + 6.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 12 * s, y + 14 * s, 9 * s, 9.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#86efac";
  ctx.beginPath();
  ctx.ellipse(x + 12 * s, y + 17 * s, 5.5 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x + 8.5 * s, y + 11.5 * s, 3.8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 15.5 * s, y + 11.5 * s, 3.8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(x + 9.2 * s, y + 11.5 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 16.2 * s, y + 11.5 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x + 10 * s, y + 10.5 * s, 0.9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 17 * s, y + 10.5 * s, 0.9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.moveTo(x + 10.5 * s, y + 15 * s);
  ctx.lineTo(x + 12 * s, y + 17.5 * s);
  ctx.lineTo(x + 13.5 * s, y + 15 * s);
  ctx.closePath();
  ctx.fill();
}

function drawTotalCard(canvas: HTMLCanvasElement, totals: TotalPnLTotals, tokenCount: number) {
  const scale = 2;
  const w = 360;
  const h = 420;
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const isPositive = totals.totalCombined >= 0;
  const pnlColor = isPositive ? C.positive : C.destructive;

  // Background
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);

  // Header
  drawOwl(ctx, 18, 17, 26);
  ctx.fillStyle = C.muted;
  ctx.font = "500 12px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("PaperTerminal", 50, 34);

  // "Portfolio P&L" badge
  ctx.font = "600 10px system-ui, -apple-system, sans-serif";
  const badge = "PORTFOLIO";
  const badgeW = ctx.measureText(badge).width + 12;
  const badgeX = w - 20 - badgeW;
  ctx.fillStyle = C.primaryBg;
  ctx.beginPath();
  ctx.roundRect(badgeX, 22, badgeW, 18, 4);
  ctx.fill();
  ctx.fillStyle = C.primary;
  ctx.textAlign = "center";
  ctx.fillText(badge, badgeX + badgeW / 2, 34);

  // Title
  ctx.fillStyle = C.fg;
  ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Total Profit & Loss", w / 2, 72);

  // Tokens traded count
  ctx.fillStyle = C.muted;
  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${tokenCount} token${tokenCount !== 1 ? "s" : ""} traded`, w / 2, 92);

  // Big PnL percentage
  ctx.fillStyle = pnlColor;
  ctx.font = "900 40px ui-monospace, 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(fmtPct(totals.totalReturnPct), w / 2, 140);

  // Total P&L USD below
  ctx.font = "bold 16px ui-monospace, 'Courier New', monospace";
  ctx.fillText(fmtPnl(totals.totalCombined), w / 2, 165);

  // Stats grid (6 items in 2x3)
  const gridX = 20;
  const gridW = (w - 52) / 2;
  const gridH = 48;
  const gap = 10;
  const gridStartY = 185;

  const stats = [
    { label: "REALIZED", value: fmtPnl(totals.totalRealized), color: totals.totalRealized >= 0 ? C.positive : C.destructive },
    { label: "UNREALIZED", value: fmtPnl(totals.totalUnrealized), color: totals.totalUnrealized >= 0 ? C.positive : C.destructive },
    { label: "INVESTED", value: `$${totals.totalInvested.toFixed(2)}`, color: C.fg },
    { label: "WIN RATE", value: tokenCount > 0 ? `${totals.winRate.toFixed(0)}%` : "-", color: C.fg },
    { label: "WINNERS", value: `${totals.winningTokens}`, color: C.positive },
    { label: "LOSERS", value: `${totals.losingTokens}`, color: C.destructive },
  ];

  stats.forEach((stat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = gridX + col * (gridW + gap);
    const y = gridStartY + row * (gridH + gap);

    ctx.fillStyle = C.cardBg;
    ctx.beginPath();
    ctx.roundRect(x, y, gridW, gridH, 8);
    ctx.fill();

    ctx.fillStyle = C.muted;
    ctx.font = "600 9px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(stat.label, x + 10, y + 17);

    ctx.fillStyle = stat.color;
    ctx.font = "bold 14px ui-monospace, 'Courier New', monospace";
    ctx.fillText(stat.value, x + 10, y + 36);
  });

  // Footer
  const footerY = gridStartY + 3 * (gridH + gap) + 6;
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, footerY);
  ctx.lineTo(w - 20, footerY);
  ctx.stroke();

  ctx.fillStyle = C.muted;
  ctx.font = "10px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), 20, footerY + 18);

  ctx.font = "10px ui-monospace, 'Courier New', monospace";
  ctx.textAlign = "right";
  ctx.fillText("paperterminal.vercel.app", w - 20, footerY + 18);
}

export function TotalPnLShareDialog({ open, onOpenChange, totals, tokenCount }: TotalPnLShareDialogProps) {
  const [downloading, setDownloading] = useState(false);

  const isPositive = totals.totalCombined >= 0;

  const copyText = () => {
    const text = `My PaperTerminal Portfolio P&L: ${fmtPct(totals.totalReturnPct)} (${fmtPnl(totals.totalCombined)})\n\nRealized: ${fmtPnl(totals.totalRealized)} | Unrealized: ${fmtPnl(totals.totalUnrealized)}\nInvested: $${totals.totalInvested.toFixed(2)} | ${tokenCount} tokens traded\nWin Rate: ${totals.winRate.toFixed(0)}% (${totals.winningTokens}W / ${totals.losingTokens}L)\n\npaperterminal.vercel.app`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    });
  };

  const copyImage = async () => {
    try {
      const canvas = document.createElement("canvas");
      drawTotalCard(canvas, totals, tokenCount);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed"))), "image/png");
      });
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast.success("Image copied to clipboard");
    } catch {
      toast.error("Failed to copy image");
    }
  };

  const downloadImage = () => {
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      drawTotalCard(canvas, totals, tokenCount);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "paperterminal-total-pnl.png";
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
          <DialogTitle>Share Total P&L</DialogTitle>
          <DialogDescription>Share your total paper trading results</DialogDescription>
        </DialogHeader>

        {/* Card preview */}
        <div className="p-5 space-y-4" style={{ background: "#09090b" }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <OwlLogo size={24} />
              <span className="text-xs text-muted-foreground font-medium">PaperTerminal</span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              PORTFOLIO
            </span>
          </div>

          {/* Title + Hero */}
          <div className="text-center space-y-1">
            <div className="font-semibold text-sm">Total Profit & Loss</div>
            <div className="text-xs text-muted-foreground">
              {tokenCount} token{tokenCount !== 1 ? "s" : ""} traded
            </div>
            <div
              className={`font-mono text-4xl font-black ${
                isPositive ? "text-positive" : "text-destructive"
              }`}
            >
              {fmtPct(totals.totalReturnPct)}
            </div>
            <div
              className={`font-mono text-base font-bold ${
                isPositive ? "text-positive" : "text-destructive"
              }`}
            >
              {fmtPnl(totals.totalCombined)}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Realized</div>
              <div className={`font-mono text-sm font-bold ${totals.totalRealized >= 0 ? "text-positive" : "text-destructive"}`}>
                {fmtPnl(totals.totalRealized)}
              </div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Unrealized</div>
              <div className={`font-mono text-sm font-bold ${totals.totalUnrealized >= 0 ? "text-positive" : "text-destructive"}`}>
                {fmtPnl(totals.totalUnrealized)}
              </div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Invested</div>
              <div className="font-mono text-sm font-bold">${totals.totalInvested.toFixed(2)}</div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Win Rate</div>
              <div className="font-mono text-sm font-bold">
                {tokenCount > 0 ? `${totals.winRate.toFixed(0)}%` : "-"}
              </div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Winners</div>
              <div className="font-mono text-sm font-bold text-positive">{totals.winningTokens}</div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Losers</div>
              <div className="font-mono text-sm font-bold text-destructive">{totals.losingTokens}</div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
            <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <span className="font-mono">paperterminal.vercel.app</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 px-5 pb-4">
          <Button variant="outline" className="flex-1" onClick={copyText}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy Text
          </Button>
          <Button variant="outline" className="flex-1" onClick={copyImage}>
            <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
            Copy Image
          </Button>
          <Button className="flex-1" onClick={downloadImage} disabled={downloading}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Save Image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
