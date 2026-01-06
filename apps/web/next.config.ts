import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow access from local network (mobile testing)
  allowedDevOrigins: ["http://172.19.198.76:3000", "http://localhost:3000", "http://192.168.100.246:3000", "af256f8fc97c58f5-196-188-244-6.serveousercontent.com"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/health',
        destination: 'http://127.0.0.1:8000/health',
      },
    ]
  },
};

export default nextConfig;
