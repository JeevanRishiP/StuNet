import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Strict security headers applied in middleware, not here
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
