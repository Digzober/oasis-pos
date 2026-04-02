import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  // Increase body size limit for API routes (image uploads)
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
} as NextConfig;

export default nextConfig;
