"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { GripHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartContainerProps {
  pairAddress: string | null;
}

const MIN_H = 250;
const DEFAULT_H = 450;

export function ChartContainer({ pairAddress }: ChartContainerProps) {
  const [height, setHeight] = useState(DEFAULT_H);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [height]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    setHeight(Math.max(MIN_H, startH.current + delta));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!pairAddress) {
    return (
      <div
        className="flex items-center justify-center border border-border rounded-lg bg-card"
        style={{ height }}
      >
        <span className="text-muted-foreground text-sm">No chart data available</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div
        className="border border-border rounded-t-lg bg-card overflow-hidden"
        style={{ height }}
      >
        <iframe
          src={`https://dexscreener.com/solana/${pairAddress}?embed=1&theme=dark&info=0&trades=0`}
          className="w-full h-full border-0"
          allow="clipboard-write"
          loading="lazy"
        />
      </div>
      {/* Resize handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex items-center justify-center h-3 cursor-row-resize border-x border-b border-border rounded-b-lg bg-card hover:bg-accent transition-colors select-none touch-none"
      >
        <GripHorizontal className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}
