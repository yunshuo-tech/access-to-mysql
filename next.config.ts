import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      bodySizeLimit: "256mb",
    },
    proxyClientMaxBodySize: "256mb",
  },
};

export default nextConfig;
