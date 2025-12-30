import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // For serverless deployment
  transpilePackages: ['@arco-design/web-react'],
};

export default nextConfig;

