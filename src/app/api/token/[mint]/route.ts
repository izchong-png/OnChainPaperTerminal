import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;

  try {
    const res = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${mint}`,
      { next: { revalidate: 300 } }
    );
    const pairs = await res.json();

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json({ error: "No pairs found" }, { status: 404 });
    }

    // Sort by liquidity and return the top pair
    const sorted = pairs.sort(
      (a: { liquidity: { usd: number } }, b: { liquidity: { usd: number } }) =>
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    );

    return NextResponse.json(sorted[0], {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ error: "Token lookup failed" }, { status: 500 });
  }
}
