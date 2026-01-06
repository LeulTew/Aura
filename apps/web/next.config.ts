import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow access from local network (mobile testing)
  allowedDevOrigins: ["http://172.19.198.76:3000", "http://localhost:3000"],
};

export default nextConfig;
