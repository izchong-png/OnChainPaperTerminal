import { Token, ChartTimeframe, ChartTimeframeConfig } from "@/types";

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const DEFAULT_INITIAL_SOL = 10;

export const SOL_TOKEN: Token = {
  mint: SOL_MINT,
  symbol: "SOL",
  name: "Solana",
  decimals: 9,
  logoURI:
    "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  verified: true,
};

export const TIMEFRAME_CONFIG: Record<ChartTimeframe, ChartTimeframeConfig> = {
  "1m": {
    label: "1m",
    geckoTimeframe: "minute",
    geckoAggregate: 1,
    pollIntervalMs: 15_000,
  },
  "5m": {
    label: "5m",
    geckoTimeframe: "minute",
    geckoAggregate: 5,
    pollIntervalMs: 15_000,
  },
  "15m": {
    label: "15m",
    geckoTimeframe: "minute",
    geckoAggregate: 15,
    pollIntervalMs: 30_000,
  },
  "1h": {
    label: "1H",
    geckoTimeframe: "hour",
    geckoAggregate: 1,
    pollIntervalMs: 60_000,
  },
  "4h": {
    label: "4H",
    geckoTimeframe: "hour",
    geckoAggregate: 4,
    pollIntervalMs: 60_000,
  },
  "1d": {
    label: "1D",
    geckoTimeframe: "day",
    geckoAggregate: 1,
    pollIntervalMs: 120_000,
  },
};

export function fromRawAmount(raw: string, decimals: number): number {
  return Number(raw) / Math.pow(10, decimals);
}

export function toRawAmount(amount: number, decimals: number): string {
  return Math.floor(amount * Math.pow(10, decimals)).toString();
}
