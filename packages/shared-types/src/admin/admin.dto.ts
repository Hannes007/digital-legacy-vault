/** Admin back-office DTOs (Phase 6) — read-only support tooling + audit search. */

export interface AuditEventDto {
  id: string;
  occurredAt: string;
  actorUserId: string | null;
  eventType: string;
  resource: string;
  ipMasked: string | null;
}

export interface AuditSearchResultDto {
  events: AuditEventDto[];
  /** True when the result set was capped at the page limit. */
  truncated: boolean;
}

export interface UserSupportSummaryDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  createdAt: string;
  subscription: { tier: string; status: string } | null;
  usage: { documents: number; vaults: number; signaturesTotal: number };
}
