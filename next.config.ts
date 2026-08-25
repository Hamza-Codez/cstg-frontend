import type { NextConfig } from "next";

/**
 * Failing the build is deliberate, and better than the alternative: without
 * this the proxy below would compile `http://localhost:8000` into a deployed
 * bundle, and every request from production would quietly try to reach a
 * backend on the *visitor's* machine. A build that stops is a five-minute fix;
 * a build that ships pointing at localhost is an afternoon of confusion.
 *
 * The message names the remedy because the person hitting it is usually
 * configuring a deploy for the first time, and "required in production" alone
 * does not say where to put it.
 */
if (process.env.NODE_ENV === "production" && !process.env.API_ORIGIN) {
  throw new Error(
    "API_ORIGIN is required for a production build.\n" +
      "Set it to the backend's public origin, with no trailing slash and no path — " +
      "for example https://cstg-backend-production.up.railway.app\n" +
      "On Vercel: Project → Settings → Environment Variables → add API_ORIGIN for " +
      "Production (and Preview), then redeploy. It is read at BUILD time, so a " +
      "change needs a rebuild, not just a restart.",
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Trailing slash stripped: a value pasted from a browser address bar tends
    // to carry one, and it would make every destination a double-slashed URL
    // that fails in a way pointing nowhere near this line.
    const apiOrigin = (process.env.API_ORIGIN || "http://localhost:8000").replace(/\/+$/, "");
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
