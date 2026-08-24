import { describe, expect, it } from "vitest";

import { sameOriginViolation } from "./origin";

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
