import type { NextConfig } from "next";

// En producción el navegador habla solo con el dominio del front; Next reenvía /api/v1/* a la API.
// Así la cookie refresh_token queda en el dominio del front y proxy.ts la puede leer (D-25).
const apiProxyTarget = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [{ source: "/api/v1/:path*", destination: `${apiProxyTarget}/api/v1/:path*` }];
  },
};

export default nextConfig;
