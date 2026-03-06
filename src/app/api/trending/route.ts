import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch trending/boosted tokens from DexScreener
    const res = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
      next: { revalidate: 60 },
    });
    const data = await res.json();

    // Filter to Solana tokens and deduplicate by address
    const seen = new Set<string>();
    const solanaTokens = (data || [])
      .filter((t: { chainId: string; tokenAddress: string }) => {
        if (t.chainId !== "solana" || seen.has(t.tokenAddress)) return false;
        seen.add(t.tokenAddress);
        return true;
      })
      .slice(0, 20);

    return NextResponse.json(solanaTokens, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch trending" }, { status: 500 });
  }
}
