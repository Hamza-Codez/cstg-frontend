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
export type PriorityMetrics = Schemas["PriorityMetrics"];
export type ConfigurationResponse = Schemas["ConfigurationResponse"];
export type PriorityRuleEntry = Schemas["PriorityRuleEntry"];
export type EventType = Schemas["EventType"];

/** Which vocabulary to render in (docs/UIUX_FRONTEND.md §4). */
export type Audience = "customer" | "staff";

/** Staff roles, i.e. everyone who is not a customer. */
export type StaffRole = Exclude<Role, "CUSTOMER">;
