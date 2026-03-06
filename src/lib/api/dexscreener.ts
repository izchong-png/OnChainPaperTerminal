import { DexScreenerPair, SearchResult } from "@/types";

export async function searchTokens(query: string): Promise<SearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];

  const pairs: DexScreenerPair[] = await res.json();

  return pairs.map((pair) => ({
    token: {
      mint: pair.baseToken.address,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      decimals: 9, // Default, will be enriched later if needed
      logoURI: pair.info?.imageUrl,
      verified: false,
    },
    poolAddress: pair.pairAddress,
    pairAddress: pair.pairAddress,
    priceUsd: parseFloat(pair.priceUsd) || 0,
    priceChange24h: pair.priceChange?.h24 ?? null,
    volume24h: pair.volume?.h24 ?? null,
    liquidity: pair.liquidity?.usd ?? null,
    dexId: pair.dexId,
  }));
}

const poolCache = new Map<string, { data: DexScreenerPair; ts: number }>();
const POOL_CACHE_TTL = 60_000; // 60 seconds

export async function getTopPool(
  mint: string
): Promise<DexScreenerPair | null> {
  const cached = poolCache.get(mint);
  if (cached && Date.now() - cached.ts < POOL_CACHE_TTL) {
    return cached.data;
  }
  const res = await fetch(`/api/token/${mint}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data) {
    poolCache.set(mint, { data, ts: Date.now() });
  }
  return data;
}

export interface TrendingToken {
  tokenAddress: string;
  description?: string;
  icon?: string;
  url?: string;
  totalAmount?: number;
  links?: { url: string; type?: string }[];
}

export async function getTrendingTokens(): Promise<TrendingToken[]> {
  const res = await fetch("/api/trending");
  if (!res.ok) return [];
  return res.json();
}
