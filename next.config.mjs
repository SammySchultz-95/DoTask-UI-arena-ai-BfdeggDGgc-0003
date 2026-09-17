/**
 * All browser traffic targets same-origin `/api/v1/*` so the panel works behind
 * any host (including sandboxed previews). In development, set API_PROXY_TARGET
 * to the DoTask backend origin and Next will proxy the API calls for us.
 */
const target = (process.env.API_PROXY_TARGET || '').replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    if (!target) return [];
    return [
      { source: '/api/v1/:path*', destination: `${target}/api/v1/:path*` },
      { source: '/health', destination: `${target}/health` },
    ];
  },
};

export default nextConfig;
