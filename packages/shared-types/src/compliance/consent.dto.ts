import type { ConsentPurpose, ConsentStatus } from '../common/consent-enums.js';

/** A first-class consent record (Phase 5). */
export interface ConsentDto {
  id: string;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  statementText: string;
  statementVersion: string;
  sourceContext: string | null;
  grantedAt: string; // ISO 8601 UTC
  withdrawnAt: string | null;
  createdAt: string;
}

/** Record a fresh consent grant. */
export interface RecordConsentRequest {
  purpose: ConsentPurpose;
  statementText: string;
  statementVersion?: string;
  sourceContext?: string;
}
