import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Upload foto bukti bayar via server action (foto HP bisa >1MB)
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
