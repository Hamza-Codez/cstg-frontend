import type { NextConfig } from "next";

if (process.env.NODE_ENV === "production" && !process.env.API_ORIGIN) {
  throw new Error("API_ORIGIN environment variable is required in production");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
