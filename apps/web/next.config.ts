import type { NextConfig } from 'next';

const apiProxyTarget = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  transpilePackages: ['@sis/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
