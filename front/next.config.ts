import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const apiProxyTarget = process.env.API_PROXY_TARGET;
const apiHostname = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).hostname
  : undefined;

const localDevHosts =
  process.env.NODE_ENV === "development"
    ? Object.values(networkInterfaces()).flatMap((addresses) =>
        (addresses ?? [])
          .filter((address) => address.family === "IPv4" && !address.internal)
          .map((address) => address.address),
      )
    : [];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [...new Set([...(apiHostname ? [apiHostname] : []), ...localDevHosts])],
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [{ source: "/api/v1/:path*", destination: `${apiProxyTarget}/api/v1/:path*` }];
  },
};

export default nextConfig;
