"use client";

import { useEffect, useState } from "react";

interface LatencyIndicatorProps {
  lastUpdated: number | null;
  className?: string;
}

export function LatencyIndicator({ lastUpdated, className = "" }: LatencyIndicatorProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!lastUpdated) return null;

  const age = Math.round((now - lastUpdated) / 1000);

  let dotColor = "bg-positive";
  let label = "Live";

  if (age > 15) {
    dotColor = "bg-destructive";
    label = `${age}s ago`;
  } else if (age > 5) {
    dotColor = "bg-yellow-500";
    label = `${age}s ago`;
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] text-muted-foreground ${className}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}
