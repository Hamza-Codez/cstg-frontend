import { describe, expect, it } from "vitest";

import { ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, preflight } from "./client-upload";

function fileOf(name: string, size: number, type: string): File {
  const file = new File(["x"], name, { type });
  // File size is read-only, so it is stubbed rather than allocating 11 MB in a
  // test process.
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("preflight", () => {
  it("accepts a file inside both limits", () => {
    expect(preflight(fileOf("notes.txt", 1024, "text/plain"))).toBeNull();
  });

  it("accepts a file at exactly the cap", () => {
    // The backend rejects on `> max`, so the boundary itself must pass here or
    // the client would refuse something the server would accept.
    expect(preflight(fileOf("edge.txt", MAX_UPLOAD_BYTES, "text/plain"))).toBeNull();
  });

  it("rejects an oversized file and names the actual limit and size", () => {
    const message = preflight(fileOf("huge.zip", 24 * 1024 * 1024, "application/zip"));
    expect(message).toContain("10 MB");
    expect(message).toContain("huge.zip");
    expect(message).toContain("24 MB");
  });

  it("rejects a disallowed content type", () => {
    expect(preflight(fileOf("evil.exe", 10, "application/x-msdownload"))).toBe(
      "That file type isn't supported.",
    );
  });

  it("defers to the backend when the browser reports no type", () => {
    // An empty type means the browser could not tell. Blocking here would
    // refuse legitimate files on a missing hint.
    expect(preflight(fileOf("unknown.bin", 10, ""))).toBeNull();
  });

  it("mirrors the backend allow-list", () => {
    expect(ALLOWED_CONTENT_TYPES).toContain("application/pdf");
    expect(ALLOWED_CONTENT_TYPES).not.toContain("application/x-msdownload");
  });
});
