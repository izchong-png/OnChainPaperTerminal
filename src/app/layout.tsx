import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PaperTerminal - Solana Paper Trading",
  description: "Simulate Solana token trading with real-time prices",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="https://api.dexscreener.com" />
        <link rel="dns-prefetch" href="https://dexscreener.com" />
        <link rel="preconnect" href="https://api.dexscreener.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
