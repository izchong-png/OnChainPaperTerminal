export interface PriceData {
  prices: Record<string, number>;
  marketCaps: Record<string, number>;
}

export async function getPrices(
  mints: string[]
): Promise<Record<string, number>> {
  if (mints.length === 0) return {};
  const data = await fetchPriceData(mints);
  return data.prices;
}

export async function fetchPriceData(
  mints: string[]
): Promise<PriceData> {
  if (mints.length === 0) return { prices: {}, marketCaps: {} };

  const res = await fetch(`/api/price?ids=${mints.join(",")}`);
  if (!res.ok) return { prices: {}, marketCaps: {} };

  const data = await res.json();
  // Handle both old format (flat prices) and new format ({ prices, marketCaps })
  if (data.prices) {
    return { prices: data.prices, marketCaps: data.marketCaps ?? {} };
  }
  // Fallback for old format
  return { prices: data, marketCaps: {} };
}
