import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sis/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
