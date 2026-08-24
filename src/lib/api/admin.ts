/** Admin reads (docs/API.md §9–11). */

import { apiFetch, type ApiResult } from "./client";
import type {
  ConfigurationResponse,
  MetricsOverview,
  PriorityRuleEntry,
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
