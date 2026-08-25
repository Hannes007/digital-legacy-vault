import type { LegalHoldScope, LegalHoldStatus } from '../common/legal-hold-enums.js';

/** A legal hold over a user, vault, or document (Phase 5). */
export interface LegalHoldDto {
  id: string;
  scopeType: LegalHoldScope;
  scopeId: string;
  reason: string;
  reference: string | null;
  status: LegalHoldStatus;
  placedByUserId: string;
  placedAt: string; // ISO 8601 UTC
  releasedByUserId: string | null;
  releasedAt: string | null;
  createdAt: string;
}

/** Place a new legal hold (compliance role only). */
export interface PlaceLegalHoldRequest {
  scopeType: LegalHoldScope;
  scopeId: string;
  reason: string;
  reference?: string;
}
