import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone', // For serverless deployment
  outputFileTracingRoot: projectRoot,
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    serverActions: {
      allowedOrigins: ['people.llmxy.xyz', 'ai-person-agent.vercel.app'],
    },
  },
  pageExtensions: ['ts', 'tsx'],
  turbopack: {
    root: projectRoot,
  },
  transpilePackages: ['@arco-design/web-react'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'abacus.ai',
      },
      {
        protocol: 'https',
        hostname: 'images.ctfassets.net',
      },
      {
        protocol: 'https',
        hostname: 'nextomoro.com',
      },
      {
        protocol: 'https',
        hostname: 'noambrown.com',
      },
      {
        protocol: 'https',
        hostname: 'www.timothybrooks.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        // 公司目录 logo（Google favicon 服务，按官网域名取）
        protocol: 'https',
        hostname: 'www.google.com',
      },
    ],
  },
};

export default nextConfig;
