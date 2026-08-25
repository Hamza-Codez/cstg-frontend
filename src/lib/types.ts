/**
 * UI-facing aliases over the generated OpenAPI contract.
 *
 * These are re-exports, never redefinitions: if the backend renames an enum
 * member, `npm run gen:api` makes this file fail to compile — the intended drift
 * alarm (docs/FRONTEND_STRUCTURE.md §6). Never hand-edit `generated/`.
 */

import type { components } from "./api/generated/schema";

type Schemas = components["schemas"];

export type TicketStatus = Schemas["TicketStatus"];
export type Priority = Schemas["Priority"];
export type Category = Schemas["Category"];
export type Role = Schemas["Role"];
export type ActorType = Schemas["ActorType"];
export type CommentType = Schemas["CommentType"];

export type TicketResponse = Schemas["TicketResponse"];
export type LoginRequest = Schemas["LoginRequest"];
export type TokenResponse = Schemas["TokenResponse"];
export type CustomerResponse = Schemas["CustomerResponse"];
export type CustomerTier = Schemas["CustomerTier"];
export type TicketDetailResponse = Schemas["TicketDetailResponse"];
export type PaginatedTicketResponse = Schemas["PaginatedTicketResponse"];
export type CommentResponse = Schemas["CommentResponse"];
export type AttachmentResponse = Schemas["AttachmentResponse"];
export type TicketEventResponse = Schemas["TicketEventResponse"];
export type AssigneeSummary = Schemas["AssigneeSummary"];
export type UserSummary = Schemas["UserSummary"];
export type MetricsOverview = Schemas["MetricsOverview"];
/**
 * One slice of the ticket population — by priority, plan or category.
 *
 * Renamed from `PriorityMetrics` at P20 when the same shape gained two more
 * dimensions. `PriorityMetrics` stays as an alias for the existing by-priority
 * call sites; it names the *use*, not the shape.
 */
export type GroupMetrics = Schemas["GroupMetrics"];
export type PriorityMetrics = GroupMetrics;
export type TimeseriesResponse = Schemas["TimeseriesResponse"];
export type TimeseriesPoint = Schemas["TimeseriesPoint"];
export type AgentMetrics = Schemas["AgentMetrics"];
export type AgentMetricsResponse = Schemas["AgentMetricsResponse"];
/** Bucket sizes and series the timeseries endpoint accepts. */
export type MetricBucket = "day" | "week" | "month";
export type MetricSeries = "created" | "resolved" | "breached" | "breach_rate";
export type ConfigurationResponse = Schemas["ConfigurationResponse"];
export type PriorityRuleEntry = Schemas["PriorityRuleEntry"];
export type SlaDurationEntry = Schemas["SlaDurationEntry"];
export type AssignmentSettings = Schemas["AssignmentSettings"];
export type NotificationItem = Schemas["NotificationItem"];
export type NotificationPage = Schemas["NotificationPage"];
export type SlaPolicySummary = Schemas["SlaPolicySummary"];
export type SlaPolicyVersionSummary = Schemas["SlaPolicyVersionSummary"];
export type EventType = Schemas["EventType"];

export type BulkResultItem = Schemas["BulkItemResult"];
export type BulkResult = Schemas["BulkResult"];
export type BulkAssignmentRequest = Schemas["BulkAssignmentRequest"];
export type BulkTransitionRequest = Schemas["BulkTransitionRequest"];
export type BulkReassignmentRequest = Schemas["BulkReassignmentRequest"];

/** Which vocabulary to render in (docs/UIUX_FRONTEND.md §4). */
export type Audience = "customer" | "staff";

/** Staff roles, i.e. everyone who is not a customer. */
export type StaffRole = Exclude<Role, "CUSTOMER">;
