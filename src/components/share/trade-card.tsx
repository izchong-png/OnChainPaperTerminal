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

// Colors matching the app's dark theme
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
  const s = size / 24; // scale factor from 24x24 viewBox
  // Ear tufts
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
  // Body
  ctx.beginPath();
  ctx.ellipse(x + 12 * s, y + 14 * s, 9 * s, 9.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Belly
  ctx.fillStyle = "#86efac";
  ctx.beginPath();
  ctx.ellipse(x + 12 * s, y + 17 * s, 5.5 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eyes white
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x + 8.5 * s, y + 11.5 * s, 3.8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 15.5 * s, y + 11.5 * s, 3.8 * s, 0, Math.PI * 2);
  ctx.fill();
  // Pupils
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(x + 9.2 * s, y + 11.5 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 16.2 * s, y + 11.5 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x + 10 * s, y + 10.5 * s, 0.9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 17 * s, y + 10.5 * s, 0.9 * s, 0, Math.PI * 2);
  ctx.fill();
  // Beak
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.moveTo(x + 10.5 * s, y + 15 * s);
  ctx.lineTo(x + 12 * s, y + 17.5 * s);
  ctx.lineTo(x + 13.5 * s, y + 15 * s);
  ctx.closePath();
  ctx.fill();
}

function drawCard(canvas: HTMLCanvasElement, data: TokenPnL) {
  const scale = 2;
  const w = 360;
  const h = 420;
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const isPositive = data.totalPnlUsd >= 0;
  const pnlColor = isPositive ? C.positive : C.destructive;

  // Background
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);

  // --- Header row (y=20) ---
  // Owl logo
  drawOwl(ctx, 18, 17, 26);

  // "PaperTerminal"
  ctx.fillStyle = C.muted;
  ctx.font = "500 12px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("PaperTerminal", 50, 34);

  // Status badge
  const status = data.status.toUpperCase();
  ctx.font = "600 10px system-ui, -apple-system, sans-serif";
  const statusW = ctx.measureText(status).width + 12;
  const statusX = w - 20 - statusW;
  if (data.status === "open") {
    ctx.fillStyle = C.primaryBg;
  } else {
    ctx.fillStyle = C.cardBg;
  }
  ctx.beginPath();
  ctx.roundRect(statusX, 22, statusW, 18, 4);
  ctx.fill();
  ctx.fillStyle = data.status === "open" ? C.primary : C.muted;
  ctx.textAlign = "center";
  ctx.fillText(status, statusX + statusW / 2, 34);

  // --- Token avatar + symbol (y=70) ---
  // Letter circle
  ctx.fillStyle = C.cardBg;
  ctx.beginPath();
  ctx.arc(w / 2 - 30, 80, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.fg;
  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(data.token.symbol.charAt(0), w / 2 - 30, 85);

  // Symbol text
  ctx.fillStyle = C.fg;
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(data.token.symbol, w / 2 - 8, 86);

  // --- Big PnL percentage (y=115) ---
  ctx.fillStyle = pnlColor;
  ctx.font = "900 36px ui-monospace, 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(fmtPct(data.totalPnlPct), w / 2, 130);

  // --- "I paper traded SYMBOL" (y=150) ---
  ctx.fillStyle = C.muted;
  ctx.font = "14px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  const line = `I paper traded ${data.token.symbol}`;
  ctx.fillText(line, w / 2, 155);

  // --- Stats grid (y=180) ---
  const gridX = 20;
  const gridW = (w - 52) / 2;
  const gridH = 52;
  const gap = 12;

  const stats = [
    { label: "TOTAL P&L", value: fmtPnl(data.totalPnlUsd), color: pnlColor },
    { label: "INVESTED", value: `$${data.totalBoughtUsd.toFixed(2)}`, color: C.fg },
    { label: "REALIZED", value: fmtPnl(data.realizedPnlUsd), color: data.realizedPnlUsd >= 0 ? C.positive : C.destructive },
    { label: "TRADES", value: `${data.totalBuys}B / ${data.totalSells}S`, color: C.fg },
  ];

  stats.forEach((stat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = gridX + col * (gridW + gap);
    const y = 180 + row * (gridH + gap);

    // Box background
    ctx.fillStyle = C.cardBg;
    ctx.beginPath();
    ctx.roundRect(x, y, gridW, gridH, 8);
    ctx.fill();

    // Label
    ctx.fillStyle = C.muted;
    ctx.font = "600 9px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(stat.label, x + 10, y + 18);

    // Value
    ctx.fillStyle = stat.color;
    ctx.font = "bold 14px ui-monospace, 'Courier New', monospace";
    ctx.fillText(stat.value, x + 10, y + 38);
  });

  // --- Footer (y=320) ---
  const footerY = 180 + 2 * (gridH + gap) + 16;

  // Separator line
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, footerY);
  ctx.lineTo(w - 20, footerY);
  ctx.stroke();

  // Date range
  ctx.fillStyle = C.muted;
  ctx.font = "10px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  let dateText = fmtDate(data.firstTradeAt);
  if (data.lastTradeAt !== data.firstTradeAt) {
    dateText += ` → ${fmtDate(data.lastTradeAt)}`;
  }
  ctx.fillText(dateText, 20, footerY + 18);

  // URL
  ctx.font = "10px ui-monospace, 'Courier New', monospace";
  ctx.textAlign = "right";
  ctx.fillText("solana-paper-trader.vercel.app", w - 20, footerY + 18);
}

export function TradeCardDialog({ open, onOpenChange, data }: TradeCardDialogProps) {
  const [downloading, setDownloading] = useState(false);

  if (!data) return null;

  const isPositive = data.totalPnlUsd >= 0;

  const copyText = () => {
    const text = `I paper traded $${data.token.symbol} ${fmtPct(data.totalPnlPct)} (${fmtPnl(data.totalPnlUsd)}) on PaperTerminal\n\nInvested: $${data.totalBoughtUsd.toFixed(2)} | ${data.totalBuys}B/${data.totalSells}S | ${data.status.toUpperCase()}\n\nsolana-paper-trader.vercel.app`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    });
  };

  const copyImage = async () => {
    try {
      const canvas = document.createElement("canvas");
      drawCard(canvas, data);
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
      drawCard(canvas, data);
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

        {/* Card preview */}
        <div
          className="p-5 space-y-4"
          style={{ background: "#09090b" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <OwlLogo size={24} />
              <span className="text-xs text-muted-foreground font-medium">PaperTerminal</span>
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
