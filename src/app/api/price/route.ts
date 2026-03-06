import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get("ids");
  if (!ids) {
    return NextResponse.json({ error: "Missing ids parameter" }, { status: 400 });
  }

  try {
    // Use DexScreener batch token endpoint (free, no key)
    const res = await fetch(
      `https://api.dexscreener.com/tokens/v1/solana/${ids}`,
      { next: { revalidate: 10 } }
    );
    const pairs = await res.json();

    if (!Array.isArray(pairs)) {
      return NextResponse.json({}, { status: 200 });
    }

    // Group by base token, pick highest-liquidity pair per token
    const bestByMint: Record<string, { priceUsd: string; liquidity: number; marketCap: number }> = {};
    for (const pair of pairs) {
      const mint = pair.baseToken?.address;
      const priceUsd = pair.priceUsd;
      const liq = pair.liquidity?.usd ?? 0;
      const mcap = pair.marketCap ?? 0;
      if (mint && priceUsd && (!bestByMint[mint] || liq > bestByMint[mint].liquidity)) {
        bestByMint[mint] = { priceUsd, liquidity: liq, marketCap: mcap };
      }
    }

    const prices: Record<string, number> = {};
    const marketCaps: Record<string, number> = {};
    for (const [mint, data] of Object.entries(bestByMint)) {
      prices[mint] = parseFloat(data.priceUsd);
      marketCaps[mint] = data.marketCap;
    }

    return NextResponse.json({ prices, marketCaps }, {
      headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ error: "Price fetch failed" }, { status: 500 });
  }
}
