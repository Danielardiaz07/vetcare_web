import type { NextConfig } from "next";

const apiProxyTarget = process.env.API_PROXY_TARGET;
const apiHostname = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: apiHostname ? [apiHostname] : undefined,
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [{ source: "/api/v1/:path*", destination: `${apiProxyTarget}/api/v1/:path*` }];
  },
};

export default nextConfig;
