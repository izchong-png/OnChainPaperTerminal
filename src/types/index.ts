export interface Token {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  verified: boolean;
}

export interface TokenWithPrice extends Token {
  priceUsd: number;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
}

export type TradeType = "buy" | "sell";

export interface PaperTrade {
  id: string;
  timestamp: number;
  type: TradeType;
  inputToken: Token;
  outputToken: Token;
  inputAmount: number;
  outputAmount: number;
  pricePerToken: number;
  priceImpactPct: number;
  totalValueUsd: number;
}

export interface TokenBalance {
  token: Token;
  amount: number;
  costBasisUsd: number;
  costBasisPerToken: number;
}

export interface Position extends TokenBalance {
  currentPriceUsd: number;
  currentValueUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
}

export interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface ChartTimeframeConfig {
  label: string;
  geckoTimeframe: "minute" | "hour" | "day";
  geckoAggregate: number;
  pollIntervalMs: number;
}

export interface SearchResult {
  token: Token;
  poolAddress: string;
  pairAddress: string;
  priceUsd: number;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  dexId: string;
}

export interface WatchlistItem {
  token: Token;
  poolAddress: string;
  addedAt: number;
}

export interface JupiterPriceData {
  id: string;
  type: string;
  price: string;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

export interface TokenPnL {
  token: Token;
  mint: string;
  totalBuys: number;
  totalSells: number;
  totalBoughtUsd: number;
  totalSoldUsd: number;
  avgEntryPrice: number;
  currentAmount: number;
  currentPrice: number;
  currentValueUsd: number;
  remainingCostBasis: number;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  totalPnlUsd: number;
  totalPnlPct: number;
  status: "open" | "closed";
  firstTradeAt: number;
  lastTradeAt: number;
}

export interface PendingOrder {
  id: string;
  mint: string;
  token: Token;
  type: "stop_loss" | "take_profit" | "limit_buy" | "limit_sell";
  triggerMcap?: number;
  amount: number;
  /** For limit orders: the token to spend (SOL for limit buy) */
  inputToken?: Token;
  /** For limit orders: how much of the input token to spend */
  spendAmount?: number;
  createdAt: number;
}

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceNative: string;
  priceUsd: string;
  volume: { h24: number };
  priceChange: { h24: number };
  liquidity: { usd: number };
  fdv: number;
  marketCap: number;
  info?: { imageUrl?: string };
}
