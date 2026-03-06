"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowDownUp, ShieldAlert, Target, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenSearchDialog } from "@/components/search/token-search-dialog";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useOrdersStore } from "@/stores/orders-store";
import { useTokenPrice } from "@/hooks/use-token-price";
import { useHydration } from "@/hooks/use-hydration";
import { SOL_TOKEN, SOL_MINT } from "@/lib/constants";
import { Token, SearchResult } from "@/types";

interface SwapPanelProps {
  defaultOutputToken?: Token;
  marketCap?: number | null;
}

export function SwapPanel({ defaultOutputToken, marketCap }: SwapPanelProps) {
  const hydrated = useHydration();
  const [swapMode, setSwapMode] = useState<"market" | "limit">("market");
  const [inputToken, setInputToken] = useState<Token>(SOL_TOKEN);
  const [outputToken, setOutputToken] = useState<Token | null>(
    defaultOutputToken ?? null
  );

  // Sync output token when defaultOutputToken loads asynchronously
  useEffect(() => {
    if (defaultOutputToken && !outputToken) {
      setOutputToken(defaultOutputToken);
    }
  }, [defaultOutputToken, outputToken]);

  const [inputAmount, setInputAmount] = useState<string>("");
  const [selectingFor, setSelectingFor] = useState<"input" | "output" | null>(
    null
  );

  // SL/TP state (market cap based)
  const [slMcap, setSlMcap] = useState<string>("");
  const [tpMcap, setTpMcap] = useState<string>("");

  // Limit order state (market cap based)
  const [limitMcap, setLimitMcap] = useState<string>("");

  const inputBalance = usePortfolioStore(
    (s) => s.balances[inputToken.mint]?.amount ?? 0
  );
  const executeTrade = usePortfolioStore((s) => s.executeTrade);
  const balances = usePortfolioStore((s) => s.balances);

  const addOrder = useOrdersStore((s) => s.addOrder);
  const orders = useOrdersStore((s) => s.orders);
  const removeOrder = useOrdersStore((s) => s.removeOrder);

  const parsedAmount = parseFloat(inputAmount) || 0;
  const parsedLimitMcap = parseFloat(limitMcap) || 0;

  const { price: inputPrice, loading: inputPriceLoading } = useTokenPrice(inputToken.mint);
  const { price: outputPrice, loading: outputPriceLoading } = useTokenPrice(
    outputToken?.mint ?? null
  );

  const priceLoading = inputPriceLoading || outputPriceLoading;

  const outputAmount = useMemo(() => {
    if (!inputPrice || !outputPrice || !outputToken || parsedAmount <= 0) return 0;
    return (parsedAmount * inputPrice) / outputPrice;
  }, [inputPrice, outputPrice, outputToken, parsedAmount]);

  const currentMcap = marketCap ?? null;

  // Limit order estimated output (mcap-based, estimate using current prices as approximation)
  const limitOutputAmount = useMemo(() => {
    if (!inputPrice || !outputToken || parsedAmount <= 0 || parsedLimitMcap <= 0 || !currentMcap || currentMcap <= 0) return 0;
    // Estimate the token price at the target mcap proportionally
    const priceRatio = parsedLimitMcap / currentMcap;
    if (inputToken.mint === SOL_MINT) {
      // Buying token: spend SOL, token price will be lower at lower mcap
      const estimatedTokenPrice = (outputPrice ?? 0) * priceRatio;
      if (estimatedTokenPrice <= 0) return 0;
      return (parsedAmount * inputPrice) / estimatedTokenPrice;
    } else {
      // Selling token: token price will be higher at higher mcap
      const estimatedTokenPrice = inputPrice * priceRatio;
      if (!outputPrice || outputPrice <= 0) return 0;
      return (parsedAmount * estimatedTokenPrice) / outputPrice;
    }
  }, [inputToken.mint, inputPrice, outputPrice, outputToken, parsedAmount, parsedLimitMcap, currentMcap]);

  // Determine which non-SOL token to show SL/TP for
  const slTpToken = outputToken?.mint !== SOL_MINT ? outputToken : inputToken.mint !== SOL_MINT ? inputToken : null;
  const slTpBalance = slTpToken ? balances[slTpToken.mint]?.amount ?? 0 : 0;
  const showSlTp = hydrated && slTpToken && slTpBalance > 0 && currentMcap && currentMcap > 0;

  // The non-SOL token for limit order context
  const limitToken = outputToken?.mint !== SOL_MINT ? outputToken : inputToken.mint !== SOL_MINT ? inputToken : null;

  // All orders for the current token (SL/TP + limit)
  const tokenOrders = useMemo(
    () => {
      const mint = slTpToken?.mint ?? limitToken?.mint;
      return mint ? orders.filter((o) => o.mint === mint) : [];
    },
    [orders, slTpToken, limitToken]
  );

  const handleFlip = () => {
    if (!outputToken) return;
    const temp = inputToken;
    setInputToken(outputToken);
    setOutputToken(temp);
    setInputAmount("");
    setLimitMcap("");
  };

  const handleSelectToken = (result: SearchResult) => {
    const token = result.token;
    if (selectingFor === "input") {
      setInputToken(token);
    } else {
      setOutputToken(token);
    }
    setSelectingFor(null);
  };

  const handleExecute = () => {
    if (!outputToken || !inputPrice || !outputPrice || parsedAmount <= 0 || outputAmount <= 0)
      return;

    const totalValueUsd = parsedAmount * inputPrice;

    const success = executeTrade({
      type: inputToken.mint === SOL_MINT ? "buy" : "sell",
      inputToken,
      outputToken,
      inputAmount: parsedAmount,
      outputAmount,
      pricePerToken: outputPrice,
      priceImpactPct: 0,
      totalValueUsd,
    });

    if (success) {
      toast.success(
        `Swapped ${parsedAmount.toFixed(4)} ${inputToken.symbol} for ${formatAmount(outputAmount)} ${outputToken.symbol}`
      );
      setInputAmount("");
      setSlMcap("");
      setTpMcap("");

      // Remove pending orders for a token that was fully sold
      const isSell = inputToken.mint !== SOL_MINT;
      if (isSell) {
        const remaining = (balances[inputToken.mint]?.amount ?? 0) - parsedAmount;
        if (remaining < 0.000001) {
          orders
            .filter((o) => o.mint === inputToken.mint)
            .forEach((o) => removeOrder(o.id));
        }
      }
    } else {
      toast.error("Insufficient balance");
    }
  };

  const handlePlaceLimitOrder = () => {
    if (!outputToken || parsedAmount <= 0 || parsedLimitMcap <= 0 || !currentMcap || currentMcap <= 0) return;

    const isBuy = inputToken.mint === SOL_MINT;
    const targetToken = isBuy ? outputToken : inputToken;

    if (isBuy) {
      // Limit buy: spend SOL to buy token when mcap drops to limit
      if (parsedAmount > inputBalance) {
        toast.error("Insufficient SOL balance");
        return;
      }
      if (parsedLimitMcap >= currentMcap) {
        toast.error("Limit buy MC must be below current MC");
        return;
      }
      addOrder({
        mint: targetToken.mint,
        token: targetToken,
        type: "limit_buy",
        triggerMcap: parsedLimitMcap,
        amount: limitOutputAmount,
        inputToken: SOL_TOKEN,
        spendAmount: parsedAmount,
      });
      toast.success(
        `Limit buy set: ${targetToken.symbol} at MC $${fmtMcap(parsedLimitMcap)}`
      );
    } else {
      // Limit sell: sell token when mcap rises to limit
      if (parsedAmount > inputBalance) {
        toast.error(`Insufficient ${inputToken.symbol} balance`);
        return;
      }
      if (parsedLimitMcap <= currentMcap) {
        toast.error("Limit sell MC must be above current MC");
        return;
      }
      addOrder({
        mint: inputToken.mint,
        token: inputToken,
        type: "limit_sell",
        triggerMcap: parsedLimitMcap,
        amount: parsedAmount,
        inputToken,
        spendAmount: parsedAmount,
      });
      toast.success(
        `Limit sell set: ${inputToken.symbol} at MC $${fmtMcap(parsedLimitMcap)}`
      );
    }
    setInputAmount("");
    setLimitMcap("");
  };

  const handleSetSl = () => {
    if (!slTpToken || !currentMcap) return;
    const trigger = parseFloat(slMcap);
    if (!trigger || trigger <= 0) {
      toast.error("Enter a valid stop loss market cap");
      return;
    }
    if (trigger >= currentMcap) {
      toast.error("Stop loss must be below current market cap");
      return;
    }
    addOrder({
      mint: slTpToken.mint,
      token: slTpToken,
      type: "stop_loss",
      triggerMcap: trigger,
      amount: slTpBalance,
    });
    toast.success(
      `Stop loss set for ${slTpToken.symbol} at MC $${fmtMcap(trigger)}`
    );
    setSlMcap("");
  };

  const handleSetTp = () => {
    if (!slTpToken || !currentMcap) return;
    const trigger = parseFloat(tpMcap);
    if (!trigger || trigger <= 0) {
      toast.error("Enter a valid take profit market cap");
      return;
    }
    if (trigger <= currentMcap) {
      toast.error("Take profit must be above current market cap");
      return;
    }
    addOrder({
      mint: slTpToken.mint,
      token: slTpToken,
      type: "take_profit",
      triggerMcap: trigger,
      amount: slTpBalance,
    });
    toast.success(
      `Take profit set for ${slTpToken.symbol} at MC $${fmtMcap(trigger)}`
    );
    setTpMcap("");
  };

  const setPercentage = (pct: number) => {
    setInputAmount((inputBalance * pct).toFixed(6));
  };

  const isLimitMode = swapMode === "limit";
  const isBuy = inputToken.mint === SOL_MINT;

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-1 bg-secondary rounded-md p-0.5">
            <button
              className={`flex-1 text-xs font-medium py-1 px-3 rounded transition-colors ${
                swapMode === "market"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setSwapMode("market")}
            >
              Market
            </button>
            <button
              className={`flex-1 text-xs font-medium py-1 px-3 rounded transition-colors ${
                swapMode === "limit"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setSwapMode("limit")}
            >
              Limit
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Input Token */}
          <div className="rounded-lg bg-secondary p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>You pay</span>
              <span>
                Balance:{" "}
                {hydrated ? (
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setPercentage(1)}
                  >
                    {inputBalance.toFixed(4)}
                  </button>
                ) : (
                  <Skeleton className="inline-block h-3 w-12" />
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="0.00"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                className="border-0 bg-transparent text-lg font-mono p-0 h-auto focus-visible:ring-0"
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-8 text-xs font-semibold"
                onClick={() => setSelectingFor("input")}
              >
                {inputToken.logoURI && (
                  <img
                    src={inputToken.logoURI}
                    alt=""
                    className="w-4 h-4 rounded-full mr-1"
                  />
                )}
                {inputToken.symbol}
              </Button>
            </div>
            {parsedAmount > 0 && inputPrice && (
              <div className="text-xs text-muted-foreground font-mono">
                ≈ ${(parsedAmount * inputPrice).toFixed(2)}
              </div>
            )}
            <div className="flex gap-1">
              {[0.25, 0.5, 0.75, 1].map((pct) => (
                <Button
                  key={pct}
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] px-1.5"
                  onClick={() => setPercentage(pct)}
                >
                  {pct === 1 ? "MAX" : `${pct * 100}%`}
                </Button>
              ))}
            </div>
          </div>

          {/* Flip Button */}
          <div className="flex justify-center -my-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={handleFlip}
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Output Token */}
          <div className="rounded-lg bg-secondary p-3 space-y-2">
            <div className="text-xs text-muted-foreground">You receive</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-lg text-foreground/80">
                {!isLimitMode ? (
                  // Market mode: show live output
                  priceLoading && parsedAmount > 0 ? (
                    <Skeleton className="h-6 w-24" />
                  ) : outputAmount > 0 ? (
                    formatAmount(outputAmount)
                  ) : (
                    <span className="text-muted-foreground">0.00</span>
                  )
                ) : (
                  // Limit mode: show estimated output
                  limitOutputAmount > 0 ? (
                    formatAmount(limitOutputAmount)
                  ) : (
                    <span className="text-muted-foreground">0.00</span>
                  )
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-8 text-xs font-semibold"
                onClick={() => setSelectingFor("output")}
              >
                {outputToken ? (
                  <>
                    {outputToken.logoURI && (
                      <img
                        src={outputToken.logoURI}
                        alt=""
                        className="w-4 h-4 rounded-full mr-1"
                      />
                    )}
                    {outputToken.symbol}
                  </>
                ) : (
                  "Select token"
                )}
              </Button>
            </div>
            {!isLimitMode && outputAmount > 0 && outputPrice && (
              <div className="text-xs text-muted-foreground font-mono">
                ≈ ${(outputAmount * outputPrice).toFixed(2)}
              </div>
            )}
            {isLimitMode && limitOutputAmount > 0 && (
              <div className="text-xs text-muted-foreground font-mono">
                ≈ ${(parsedAmount * (inputPrice ?? 0)).toFixed(2)}
              </div>
            )}
          </div>

          {/* Limit Market Cap Input */}
          {isLimitMode && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {isBuy ? "Buy" : "Sell"} when {limitToken?.symbol ?? "token"} MC reaches
                  </span>
                </div>
                {currentMcap && currentMcap > 0 && (
                  <button
                    className="text-primary hover:underline font-mono"
                    onClick={() => setLimitMcap(Math.round(currentMcap).toString())}
                  >
                    Now: ${fmtMcap(currentMcap)}
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder={currentMcap ? fmtMcap(currentMcap) : "0"}
                  value={limitMcap}
                  onChange={(e) => setLimitMcap(e.target.value)}
                  className="font-mono text-lg pl-5 h-10"
                  step="any"
                />
              </div>
              {currentMcap && currentMcap > 0 && parsedLimitMcap > 0 && (
                <div className="text-xs font-mono text-muted-foreground">
                  {((parsedLimitMcap / currentMcap - 1) * 100) >= 0 ? "+" : ""}
                  {((parsedLimitMcap / currentMcap - 1) * 100).toFixed(1)}% from current
                </div>
              )}
              <div className="flex gap-1">
                {isBuy
                  ? [5, 10, 15, 25].map((pct) => (
                      <Button
                        key={pct}
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[10px] px-1.5"
                        disabled={!currentMcap}
                        onClick={() => {
                          if (!currentMcap) return;
                          setLimitMcap(Math.round(currentMcap * (1 - pct / 100)).toString());
                        }}
                      >
                        -{pct}%
                      </Button>
                    ))
                  : [5, 10, 25, 50].map((pct) => (
                      <Button
                        key={pct}
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[10px] px-1.5"
                        disabled={!currentMcap}
                        onClick={() => {
                          if (!currentMcap) return;
                          setLimitMcap(Math.round(currentMcap * (1 + pct / 100)).toString());
                        }}
                      >
                        +{pct}%
                      </Button>
                    ))}
              </div>
            </div>
          )}

          {/* Rate Info (market mode only) */}
          {!isLimitMode && inputPrice && outputPrice && outputToken && parsedAmount > 0 && outputAmount > 0 && (
            <div className="space-y-1 text-xs text-muted-foreground px-1">
              <div className="flex justify-between">
                <span>Rate</span>
                <span className="font-mono">
                  1 {inputToken.symbol} ={" "}
                  {formatAmount(inputPrice / outputPrice)}{" "}
                  {outputToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{inputToken.symbol} price</span>
                <span className="font-mono">${formatUsd(inputPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>{outputToken.symbol} price</span>
                <span className="font-mono">${formatUsd(outputPrice)}</span>
              </div>
            </div>
          )}

          {/* Execute Button */}
          {!isLimitMode ? (
            <Button
              className="w-full"
              size="lg"
              disabled={
                !outputToken ||
                parsedAmount <= 0 ||
                (priceLoading && parsedAmount > 0) ||
                !inputPrice ||
                !outputPrice ||
                outputAmount <= 0 ||
                parsedAmount > inputBalance
              }
              onClick={handleExecute}
            >
              {!outputToken
                ? "Select a token"
                : parsedAmount <= 0
                  ? "Enter an amount"
                  : parsedAmount > inputBalance
                    ? "Insufficient balance"
                    : priceLoading
                      ? "Loading prices..."
                      : !inputPrice || !outputPrice
                        ? "Price unavailable"
                        : `Swap ${inputToken.symbol} → ${outputToken.symbol}`}
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              disabled={
                !outputToken ||
                parsedAmount <= 0 ||
                parsedLimitMcap <= 0 ||
                parsedAmount > inputBalance ||
                !currentMcap ||
                currentMcap <= 0
              }
              onClick={handlePlaceLimitOrder}
            >
              {!outputToken
                ? "Select a token"
                : parsedAmount <= 0
                  ? "Enter an amount"
                  : parsedLimitMcap <= 0
                    ? "Set a limit market cap"
                    : parsedAmount > inputBalance
                      ? "Insufficient balance"
                      : !currentMcap || currentMcap <= 0
                        ? "Market cap unavailable"
                        : `Place Limit ${isBuy ? "Buy" : "Sell"}`}
            </Button>
          )}

          {/* Stop Loss / Take Profit (market mode, with position) */}
          {!isLimitMode && showSlTp && (
            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Stop Loss / Take Profit</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {slTpToken.symbol} MC ${fmtMcap(currentMcap)}
                </span>
              </div>

              {/* Stop Loss Input */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="h-3 w-3 text-destructive shrink-0" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Stop Loss (Market Cap)
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      placeholder={fmtMcap(currentMcap * 0.9)}
                      value={slMcap}
                      onChange={(e) => setSlMcap(e.target.value)}
                      className="font-mono text-sm h-8 pl-5"
                      step="any"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs px-3"
                    onClick={handleSetSl}
                    disabled={!slMcap || parseFloat(slMcap) <= 0}
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
                      onClick={() =>
                        setSlMcap(Math.round(currentMcap * (1 - pct / 100)).toString())
                      }
                    >
                      -{pct}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Take Profit Input */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-positive shrink-0" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Take Profit (Market Cap)
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      placeholder={fmtMcap(currentMcap * 1.5)}
                      value={tpMcap}
                      onChange={(e) => setTpMcap(e.target.value)}
                      className="font-mono text-sm h-8 pl-5"
                      step="any"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-xs px-3 bg-positive text-positive-foreground hover:bg-positive/90"
                    onClick={handleSetTp}
                    disabled={!tpMcap || parseFloat(tpMcap) <= 0}
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
                      onClick={() =>
                        setTpMcap(Math.round(currentMcap * (1 + pct / 100)).toString())
                      }
                    >
                      +{pct}%
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Orders */}
          {tokenOrders.length > 0 && (
            <div className="border-t border-border pt-3 space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Active Orders
              </span>
              {tokenOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded bg-secondary px-2 py-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    {order.type === "stop_loss" ? (
                      <ShieldAlert className="h-3 w-3 text-destructive" />
                    ) : order.type === "take_profit" ? (
                      <Target className="h-3 w-3 text-positive" />
                    ) : (
                      <Clock className="h-3 w-3 text-primary" />
                    )}
                    <span className="text-xs">
                      {order.type === "stop_loss"
                        ? "SL"
                        : order.type === "take_profit"
                          ? "TP"
                          : order.type === "limit_buy"
                            ? "Limit Buy"
                            : "Limit Sell"}
                    </span>
                    <span className="font-mono text-xs">
                      {order.triggerMcap
                        ? `MC $${fmtMcap(order.triggerMcap)}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {order.type === "limit_buy" && order.spendAmount
                        ? `${formatAmount(order.spendAmount)} SOL`
                        : `${formatAmount(order.amount)} ${order.token.symbol}`}
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
        </CardContent>
      </Card>

      <TokenSearchDialog
        open={selectingFor !== null}
        onOpenChange={(open) => !open && setSelectingFor(null)}
        onSelect={handleSelectToken}
      />
    </>
  );
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (n >= 0.0001) return n.toFixed(6);
  return n.toExponential(2);
}

function formatUsd(n: number): string {
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toExponential(2);
}

function fmtMcap(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}
