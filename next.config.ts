import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "dd.dexscreener.com" },
      { protocol: "https", hostname: "img.dexscreener.com" },
    ],
  },
};

export default nextConfig;
