/** Admin reads (docs/API.md §9–11). */

import { apiFetch, type ApiResult } from "./client";
import type {
  ConfigurationResponse,
  MetricsOverview,
  Priority,
  PriorityRuleEntry,
  SlaPolicyVersionSummary,
  UserSummary,
} from "@/lib/types";

export function getMetrics(token: string): Promise<ApiResult<MetricsOverview>> {
  return apiFetch<MetricsOverview>("/api/v1/metrics/overview", { token });
}

export function listStaff(token: string): Promise<ApiResult<{ items: UserSummary[] }>> {
  return apiFetch<{ items: UserSummary[] }>("/api/v1/users", { token });
}

export function getConfiguration(token: string): Promise<ApiResult<ConfigurationResponse>> {
  return apiFetch<ConfigurationResponse>("/api/v1/configuration", { token });
}

export function replacePriorityRules(
  token: string,
  rules: PriorityRuleEntry[],
): Promise<ApiResult<ConfigurationResponse>> {
  return apiFetch<ConfigurationResponse>("/api/v1/configuration/priority-rules", {
    method: "PUT",
    token,
    body: { rules },
  });
}

/**
 * Publish a new SLA policy version (docs/API.md §11).
 *
 * The whole policy at once, because it must stay total. Affects **new tickets
 * only** — priority and deadline are frozen at creation (INV-1).
 */
export function replaceSlaPolicy(
  token: string,
  body: { durations: Array<{ priority: Priority; seconds: number }>; note?: string },
): Promise<ApiResult<ConfigurationResponse>> {
  return apiFetch<ConfigurationResponse>("/api/v1/configuration/sla-policy", {
    method: "PUT",
    token,
    body,
  });
}

/** Every version, newest first — what makes a frozen deadline explainable. */
export function getSlaPolicyHistory(
  token: string,
): Promise<ApiResult<{ items: SlaPolicyVersionSummary[] }>> {
  return apiFetch<{ items: SlaPolicyVersionSummary[] }>(
    "/api/v1/configuration/sla-policy/history",
    { token },
  );
}
