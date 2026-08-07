import type { NextConfig } from "next";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost:3000", "192.168.1.168:3000", "192.168.1.*"],
  outputFileTracingRoot: process.cwd(),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
