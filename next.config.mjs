/** @type {import('next').NextConfig} */
const nextConfig = {
  // הכרחת Next.js להשתמש ב-Webpack במקום ב-Turbopack
  webpack: (config) => {
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
    workerThreads: false,
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "hakel.club",
        "www.hakel.club",
        "kampin.web.app",
        "kampin.firebaseapp.com",
        "c-g-ltd.web.app",
        "c-g-ltd.firebaseapp.com",
      ],
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
