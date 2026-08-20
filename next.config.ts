import type { NextConfig } from "next";

const apiBaseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000/v1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "kumtru-assets.s3.amazonaws.com" },
      { protocol: "https", hostname: "kumtru-assets.s3.eu-west-1.amazonaws.com" },
      { protocol: "https", hostname: "cdn.kumtru.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
