import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "hakel.club",
        "www.hakel.club",
        "c-g-ltd.web.app",
        "c-g-ltd.firebaseapp.com"
      ]
    }
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  serverExternalPackages: [
    "firebase-admin",
    "firebase-admin/app",
    "firebase-admin/firestore",
    "firebase-admin/auth",
    "firebase-admin/storage",
    "@google-cloud/firestore"
  ],
};

export default nextConfig;
