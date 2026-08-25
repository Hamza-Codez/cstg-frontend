import { describe, expect, it } from "vitest";

import { sameOriginViolation } from "./origin";
import { isSameOrigin } from "./same-origin";

function request(
  method: string,
  headers: Record<string, string>,
): Request {
  return new Request("http://app.test/api/attachments/1", { method, headers });
}

describe("sameOriginViolation", () => {
  it("lets safe methods through without an Origin", () => {
    // Next validates Origin for Server Actions but not Route Handlers, so this
    // guard exists — but a GET download is not a CSRF vector.
    expect(sameOriginViolation(request("GET", { host: "app.test" }))).toBeNull();
  });

  it("allows a mutation from the same origin", () => {
    const result = sameOriginViolation(
      request("POST", { host: "app.test", origin: "http://app.test" }),
    );
    expect(result).toBeNull();
  });

  it("refuses a mutation from another origin", () => {
    const result = sameOriginViolation(
      request("POST", { host: "app.test", origin: "http://evil.test" }),
    );
    expect(result?.status).toBe(403);
  });

  it("falls back to Referer when Origin is stripped", () => {
    // Some privacy tooling removes Origin on same-origin requests; rejecting
    // those would break the app for those users.
    const result = sameOriginViolation(
      request("POST", { host: "app.test", referer: "http://app.test/requests/1" }),
    );
    expect(result).toBeNull();
  });

  it("refuses a mutation carrying neither Origin nor Referer", () => {
    expect(sameOriginViolation(request("POST", { host: "app.test" }))?.status).toBe(403);
  });

  it("refuses a mutation with an unparseable Origin", () => {
    const result = sameOriginViolation(
      request("POST", { host: "app.test", origin: "not-a-url" }),
    );
    expect(result?.status).toBe(403);
  });

  it("returns the standard error envelope so the client parses it as usual", async () => {
    const result = sameOriginViolation(
      request("POST", { host: "app.test", origin: "http://evil.test" }),
    );
    await expect(result?.json()).resolves.toEqual({
      error: { code: "FORBIDDEN", message: "Cross-origin request refused.", details: {} },
    });
  });
});

describe("isSameOrigin", () => {
  it("accepts whatever port the server actually bound to", () => {
    // The regression: APP_FRONTEND_ORIGIN was pinned to :3000, so browsing the
    // app on any other port made every Server Action throw and surface as
    // Internal Server Error. Comparing against the request's own host cannot go
    // stale this way.
    expect(isSameOrigin("http://localhost:3002", "localhost:3002")).toBe(true);
    expect(isSameOrigin("http://localhost:3006", "localhost:3006")).toBe(true);
  });

  it("works with no APP_FRONTEND_ORIGIN configured at all", () => {
    const saved = process.env.APP_FRONTEND_ORIGIN;
    delete process.env.APP_FRONTEND_ORIGIN;
    try {
      expect(isSameOrigin("https://preview-abc.vercel.app", "preview-abc.vercel.app")).toBe(true);
    } finally {
      if (saved !== undefined) process.env.APP_FRONTEND_ORIGIN = saved;
    }
  });

  it("still refuses a genuinely different origin", () => {
    expect(isSameOrigin("http://evil.test", "app.test")).toBe(false);
  });

  it("refuses when either side is missing", () => {
    expect(isSameOrigin(null, "app.test")).toBe(false);
    expect(isSameOrigin("http://app.test", null)).toBe(false);
  });

  it("honours APP_FRONTEND_ORIGIN as an ADDITIONAL allowance, not a requirement", () => {
    // For deployments behind a proxy that rewrites Host.
    const saved = process.env.APP_FRONTEND_ORIGIN;
    process.env.APP_FRONTEND_ORIGIN = "https://app.example.com";
    try {
      expect(isSameOrigin("https://app.example.com", "internal-host:8080")).toBe(true);
      expect(isSameOrigin("https://evil.test", "internal-host:8080")).toBe(false);
    } finally {
      if (saved === undefined) delete process.env.APP_FRONTEND_ORIGIN;
      else process.env.APP_FRONTEND_ORIGIN = saved;
    }
  });
});
