import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // For serverless deployment
  transpilePackages: ['@arco-design/web-react'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
};

export default nextConfig;

