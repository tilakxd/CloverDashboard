import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // basePath and assetPrefix are for production deployment
  // Commented out for local development
  // basePath: '/dashboard',
  // assetPrefix: '/dashboard',
  output: 'standalone',
};

export default nextConfig;

