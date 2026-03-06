"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getPrices, fetchPriceData } from "@/lib/api/jupiter";

export function useTokenPrice(mint: string | null) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!mint) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const prices = await getPrices([mint]);
      if (!controller.signal.aborted && prices[mint] !== undefined) {
        setPrice(prices[mint]);
      }
    } catch {
      // Silently fail, keep previous price
    }
  }, [mint]);

  useEffect(() => {
    setPrice(null);
    setLoading(true);

    if (document.visibilityState === "visible") {
      fetchPrice().then(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchPrice();
      }
    }, 5_000);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchPrice]);

  return { price, loading };
}

export function useTokenPrices(mints: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [marketCaps, setMarketCaps] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Stabilize mints reference to prevent infinite re-renders
  const mintsKey = mints.join(",");
  const mintsRef = useRef(mints);
  if (mintsRef.current.join(",") !== mintsKey) {
    mintsRef.current = mints;
  }

  const fetchPrices = useCallback(async () => {
    const currentMints = mintsRef.current;
    if (currentMints.length === 0) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const data = await fetchPriceData(currentMints);
      if (!controller.signal.aborted) {
        setPrices((prev) => ({ ...prev, ...data.prices }));
        setMarketCaps((prev) => ({ ...prev, ...data.marketCaps }));
      }
    } catch {
      // Keep previous prices
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mintsKey]);

  useEffect(() => {
    setLoading(true);

    if (document.visibilityState === "visible") {
      fetchPrices().then(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchPrices();
      }
    }, 5_000);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchPrices]);

  return { prices, marketCaps, loading };
}
