/** Admin reads (docs/API.md §9–11). */

import { apiFetch, type ApiResult } from "./client";
import type {
  AgentMetricsResponse,
  AssignmentSettings,
  ConfigurationResponse,
  MetricBucket,
  MetricSeries,
  MetricsOverview,
  Priority,
  PriorityRuleEntry,
  SlaPolicyVersionSummary,
  TimeseriesResponse,
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

/** Partial staff update: capacity and automation opt-out (docs/API.md §10). */
export function updateStaff(
  token: string,
  userId: string,
  body: { max_open_tickets?: number | null; accepts_auto_assignment?: boolean },
): Promise<ApiResult<UserSummary>> {
  return apiFetch<UserSummary>(`/api/v1/users/${userId}`, { method: "PATCH", token, body });
}

/** How new tickets are routed (docs/API.md §11). */
export function setAssignmentConfig(
  token: string,
  body: AssignmentSettings,
): Promise<ApiResult<ConfigurationResponse>> {
  return apiFetch<ConfigurationResponse>("/api/v1/configuration/assignment", {
    method: "PUT",
    token,
    body,
  });
}

/**
 * Bucketed history for the Trends tab (docs/API.md §9).
 *
 * The backend emits empty buckets as explicit zeros, so the chart never has to
 * guess at a gap — a line interpolated across a silent day reports steady
 * activity on a day with none.
 *
 * Over 366 buckets the backend returns 422; the caller surfaces that rather
 * than narrowing the range on the user's behalf.
 */
export function getTimeseries(
  token: string,
  params: { metric: MetricSeries; bucket: MetricBucket; from: string; to: string },
): Promise<ApiResult<TimeseriesResponse>> {
  const query = new URLSearchParams({
    metric: params.metric,
    bucket: params.bucket,
    from: params.from,
    to: params.to,
  });
  return apiFetch<TimeseriesResponse>(`/api/v1/metrics/timeseries?${query}`, { token });
}

/**
 * Per-agent workload over a period (docs/API.md §9).
 *
 * The response carries `attribution_note`; render it. Attribution is by
 * *current* assignee, and an unlabelled approximation in a view of named
 * people is how a metric quietly becomes unfair.
 */
export function getAgentMetrics(
  token: string,
  params: { from: string; to: string },
): Promise<ApiResult<AgentMetricsResponse>> {
  const query = new URLSearchParams({ from: params.from, to: params.to });
  return apiFetch<AgentMetricsResponse>(`/api/v1/metrics/agents?${query}`, { token });
}
