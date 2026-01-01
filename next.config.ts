import type { NextConfig } from "next";

// Prevent caching on admin pages to avoid 304 responses
const noCacheHeaders = [
  {
    key: 'Cache-Control',
    value: 'no-store',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/admin-panel',
        headers: noCacheHeaders,
      },
      {
        source: '/admin-login',
        headers: noCacheHeaders,
      },
    ];
  },
};

export default nextConfig;
