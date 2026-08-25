/**
 * Typed fetch wrapper around the backend contract (docs/API.md §1–2).
 *
 * Returns a discriminated result instead of throwing, so callers must deal with
 * the failure case. The backend's uniform error envelope is parsed here once;
 * nothing above this layer touches raw responses.
 */

export const API_BASE_URL = (typeof window === "undefined"
  ? (process.env.API_ORIGIN ?? "http://localhost:8000")
  : "").replace(/\/$/, "");

/** Error codes from docs/API.md §2. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "STATE_CONFLICT"
  | "BUSINESS_RULE_VIOLATION"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
  status: number;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

const FALLBACK: Record<number, ApiErrorCode> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "STATE_CONFLICT",
  422: "BUSINESS_RULE_VIOLATION",
};

async function toError(response: Response): Promise<ApiError> {
  const fallbackCode = FALLBACK[response.status] ?? "INTERNAL_ERROR";
  try {
    const body = (await response.json()) as {
      error?: { code?: ApiErrorCode; message?: string; details?: unknown };
    };
    return {
      code: body.error?.code ?? fallbackCode,
      message: body.error?.message ?? "Something went wrong.",
      details: body.error?.details,
      status: response.status,
    };
  } catch {
    // A non-JSON body (proxy error, crash) still has to become a typed failure.
    return { code: fallbackCode, message: "Something went wrong.", status: response.status };
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Bearer token. Server components read it from the cookie via `authHeader()`. */
  token?: string;
  signal?: AbortSignal;
  /** Next.js caching; defaults to no-store since every response is per-principal. */
  cache?: RequestCache;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = "GET", body, token, signal, cache = "no-store" } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      cache,
    });
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Could not reach the server.", status: 0 },
    };
  }

  if (!response.ok) return { ok: false, error: await toError(response) };
  if (response.status === 204) return { ok: true, data: undefined as T };

  return { ok: true, data: (await response.json()) as T };
}
