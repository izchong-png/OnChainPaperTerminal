"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchPriceData } from "@/lib/api/jupiter";

export function useTokenPrice(mint: string | null) {
  const [price, setPrice] = useState<number | null>(null);
  const [marketCap, setMarketCap] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!mint) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const data = await fetchPriceData([mint]);
      if (!controller.signal.aborted) {
        if (data.prices[mint] !== undefined) {
          setPrice(data.prices[mint]);
        }
        if (data.marketCaps[mint] !== undefined) {
          setMarketCap(data.marketCaps[mint]);
        }
        setLastUpdated(Date.now());
      }
    } catch {
      // Silently fail, keep previous price
    }
  }, [mint]);

  useEffect(() => {
    setPrice(null);
    setLastUpdated(null);
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
    }, 1_000);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchPrice]);

  return { price, marketCap, loading, lastUpdated };
}

export function useTokenPrices(mints: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [marketCaps, setMarketCaps] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
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
        setLastUpdated(Date.now());
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
    }, 3_000);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchPrices]);

  return { prices, marketCaps, loading, lastUpdated };
}
