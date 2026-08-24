import { headers } from "next/headers";

export async function assertSameOrigin(): Promise<void> {
  const reqHeaders = await headers();
  const origin = reqHeaders.get("origin");
  const expectedOrigin = process.env.APP_FRONTEND_ORIGIN;

  if (!expectedOrigin) {
    throw new Error("APP_FRONTEND_ORIGIN is not configured");
  }

  if (!origin || origin !== expectedOrigin) {
    throw new Error("Cross-origin mutation forbidden");
  }
}
