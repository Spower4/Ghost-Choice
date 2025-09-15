import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazon.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'shopping.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.walmart.com',
      },
      {
        protocol: 'https',
        hostname: '*.target.com',
      },
      {
        protocol: 'https',
        hostname: '*.bestbuy.com',
      },
      {
        protocol: 'https',
        hostname: '*.wayfair.com',
      },
      {
        protocol: 'https',
        hostname: '*.homedepot.com',
      },
      {
        protocol: 'https',
        hostname: '*.lowes.com',
      }
    ],
  },
};

export default nextConfig;
