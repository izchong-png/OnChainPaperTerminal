"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Zap, GripHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useTokenPrice } from "@/hooks/use-token-price";
import { useHydration } from "@/hooks/use-hydration";
import { SOL_TOKEN, SOL_MINT } from "@/lib/constants";
import { Token } from "@/types";

interface InstantTradePopupProps {
  token: Token;
  price: number | null;
}

const BUY_PRESETS = [0.1, 0.5, 1, 2, 5];
const SELL_PRESETS = [0.25, 0.5, 0.75, 1];

export function InstantTradePopup({ token, price }: InstantTradePopupProps) {
  const hydrated = useHydration();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [customAmount, setCustomAmount] = useState("");

  // Drag state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const { price: solPrice } = useTokenPrice(SOL_MINT);
  const executeTrade = usePortfolioStore((s) => s.executeTrade);
  const solBalance = usePortfolioStore(
    (s) => s.balances[SOL_MINT]?.amount ?? 0
  );
  const tokenBalance = usePortfolioStore(
    (s) => s.balances[token.mint]?.amount ?? 0
  );
  const costBasis = usePortfolioStore(
    (s) => s.balances[token.mint]?.costBasisUsd ?? 0
  );

  const tokenValue = tokenBalance * (price ?? 0);
  const pnlUsd = costBasis > 0 ? tokenValue - costBasis : 0;
  const pnlPct = costBasis > 0 ? (pnlUsd / costBasis) * 100 : 0;

  // Initialize position to center of viewport on first open
  const handleOpen = useCallback(() => {
    if (!pos) {
      setPos({
        x: Math.round(window.innerWidth / 2 - 144),
        y: Math.round(window.innerHeight / 2 - 200),
      });
    }
    setOpen(true);
  }, [pos]);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    dragging.current = true;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!open) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 288));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 100));
      setPos({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      dragging.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [open]);

  const handleBuy = (solAmount: number) => {
    if (!price || !solPrice || price <= 0 || solPrice <= 0) {
      toast.error("Price unavailable");
      return;
    }
    if (solAmount > solBalance) {
      toast.error("Insufficient SOL balance");
      return;
    }
    if (solAmount <= 0) return;

    const totalValueUsd = solAmount * solPrice;
    const outputAmount = totalValueUsd / price;

    const success = executeTrade({
      type: "buy",
      inputToken: SOL_TOKEN,
      outputToken: token,
      inputAmount: solAmount,
      outputAmount,
      pricePerToken: price,
      priceImpactPct: 0,
      totalValueUsd,
    });

    if (success) {
      toast.success(
        `Bought ${fmtAmount(outputAmount)} ${token.symbol} for ${solAmount} SOL`
      );
      setCustomAmount("");
    } else {
      toast.error("Trade failed");
    }
  };

  const handleSell = (pct: number) => {
    if (!price || !solPrice || price <= 0 || solPrice <= 0) {
      toast.error("Price unavailable");
      return;
    }
    const sellAmount = tokenBalance * pct;
    if (sellAmount <= 0) return;

    const totalValueUsd = sellAmount * price;
    const outputSol = totalValueUsd / solPrice;

    const success = executeTrade({
      type: "sell",
      inputToken: token,
      outputToken: SOL_TOKEN,
      inputAmount: sellAmount,
      outputAmount: outputSol,
      pricePerToken: price,
      priceImpactPct: 0,
      totalValueUsd,
    });

    if (success) {
      toast.success(
        `Sold ${fmtAmount(sellAmount)} ${token.symbol} for ${fmtAmount(outputSol)} SOL`
      );
    } else {
      toast.error("Trade failed");
    }
  };

  if (!hydrated) return null;

  return (
    <>
      {/* Trigger Button */}
      <Button
        className="w-full mb-3"
        variant="outline"
        onClick={handleOpen}
      >
        <Zap className="h-4 w-4 mr-2" />
        Instant Trade
      </Button>

      {/* Draggable Floating Panel */}
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-50 w-72 rounded-lg border border-border bg-background shadow-xl"
            style={{ left: pos.x, top: pos.y }}
          >
            {/* Drag Handle + Close */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b border-border cursor-grab active:cursor-grabbing select-none"
              onMouseDown={onMouseDown}
            >
              <div className="flex items-center gap-2">
                <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex items-center gap-1.5">
                  {token.logoURI && (
                    <img
                      src={token.logoURI}
                      alt=""
                      className="w-4 h-4 rounded-full"
                    />
                  )}
                  <span className="font-bold text-sm">{token.symbol}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  {price ? `$${fmtUsd(price)}` : "..."}
                </span>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Position Info */}
            {tokenBalance > 0.000001 && (
              <div className="mx-3 mt-2 mb-2 rounded bg-secondary px-2.5 py-1.5 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-muted-foreground">Holding </span>
                  <span className="font-mono font-medium">
                    {fmtAmount(tokenBalance)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono">
                    ${tokenValue.toFixed(2)}
                  </div>
                  {costBasis > 0 && (
                    <div
                      className={`text-[10px] font-mono ${
                        pnlUsd >= 0 ? "text-positive" : "text-destructive"
                      }`}
                    >
                      {pnlUsd >= 0 ? "+" : ""}${pnlUsd.toFixed(2)} (
                      {pnlPct >= 0 ? "+" : ""}
                      {pnlPct.toFixed(1)}%)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Buy / Sell Tabs */}
            <div className="mx-3 mb-2 flex gap-1 bg-secondary rounded-md p-0.5">
              <button
                className={`flex-1 text-xs font-medium py-1 rounded transition-colors ${
                  tab === "buy"
                    ? "bg-positive text-positive-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("buy")}
              >
                Buy
              </button>
              <button
                className={`flex-1 text-xs font-medium py-1 rounded transition-colors ${
                  tab === "sell"
                    ? "bg-destructive text-destructive-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("sell")}
              >
                Sell
              </button>
            </div>

            <div className="px-3 pb-3 space-y-2">
              {tab === "buy" ? (
                <>
                  <div className="text-[10px] text-muted-foreground">
                    SOL Balance:{" "}
                    <span className="font-mono">{solBalance.toFixed(4)}</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {BUY_PRESETS.map((amt) => (
                      <Button
                        key={amt}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-mono px-0"
                        disabled={amt > solBalance || !price || !solPrice}
                        onClick={() => handleBuy(amt)}
                      >
                        {amt}
                      </Button>
                    ))}
                  </div>

                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        placeholder="SOL amount"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="font-mono text-sm h-8 pr-12"
                        step="any"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                        SOL
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-xs px-3 bg-positive text-positive-foreground hover:bg-positive/90"
                      disabled={
                        !customAmount ||
                        parseFloat(customAmount) <= 0 ||
                        parseFloat(customAmount) > solBalance ||
                        !price ||
                        !solPrice
                      }
                      onClick={() => handleBuy(parseFloat(customAmount) || 0)}
                    >
                      Buy
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {tokenBalance > 0.000001 ? (
                    <>
                      <div className="text-[10px] text-muted-foreground">
                        {token.symbol} Balance:{" "}
                        <span className="font-mono">
                          {fmtAmount(tokenBalance)}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1">
                        {SELL_PRESETS.map((pct) => (
                          <Button
                            key={pct}
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs font-medium"
                            disabled={!price || !solPrice}
                            onClick={() => handleSell(pct)}
                          >
                            <div className="text-center">
                              <div>
                                {pct === 1 ? "100%" : `${pct * 100}%`}
                              </div>
                              <div className="text-[9px] text-muted-foreground font-mono">
                                {fmtAmount(tokenBalance * pct)}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>

                      {price && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          Full position ≈{" "}
                          <span className="font-mono">
                            ${tokenValue.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      No {token.symbol} to sell
                    </div>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function fmtAmount(n: number): string {
  if (n >= 1_000_000)
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (n >= 0.0001) return n.toFixed(6);
  return n.toExponential(2);
}

function fmtUsd(n: number): string {
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toExponential(2);
}
