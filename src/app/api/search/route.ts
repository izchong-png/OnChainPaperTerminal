import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,
      { next: { revalidate: 30 } }
    );
    const data = await res.json();

    const solanaPairs = (data.pairs || [])
      .filter((p: { chainId: string }) => p.chainId === "solana")
      .slice(0, 20);

    return NextResponse.json(solanaPairs, {
      headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
