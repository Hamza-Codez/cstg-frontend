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
      // rules.md §4 verification step 3 expects <frontend>/api/health to answer
      // {"status":"ok"} — proof the rewrite compiled in. The backend mounts
      // health at the root, outside /api/v1, so it needs its own rule.
      { source: "/api/health", destination: `${apiOrigin}/health` },
      { source: "/api/health/db", destination: `${apiOrigin}/health/db` },
    ];
  },
};

export default nextConfig;
