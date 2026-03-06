"use client";

import { Header } from "./header";
import { useOrderMonitor } from "@/hooks/use-order-monitor";

export function TerminalLayout({ children }: { children: React.ReactNode }) {
  useOrderMonitor();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
