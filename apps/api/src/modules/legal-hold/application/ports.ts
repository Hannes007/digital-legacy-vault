import type { LegalHoldScope, LegalHoldStatus } from '@dlv/shared-types';

export const LEGAL_HOLD_REPOSITORY = Symbol('LEGAL_HOLD_REPOSITORY');

export interface LegalHoldRecord {
  id: string;
  scopeType: LegalHoldScope;
  scopeId: string;
  reason: string;
  reference: string | null;
  status: LegalHoldStatus;
  placedByUserId: string;
  placedAt: Date;
  releasedByUserId: string | null;
  releasedAt: Date | null;
  createdAt: Date;
}

export interface CreateLegalHoldInput {
  id: string;
  scopeType: LegalHoldScope;
  scopeId: string;
  reason: string;
  reference: string | null;
  placedByUserId: string;
  placedAt: Date;
}

/** A (scopeType, scopeId) pair to test against active holds. */
export interface ScopeRef {
  scopeType: LegalHoldScope;
  scopeId: string;
}

export interface LegalHoldRepository {
  create(input: CreateLegalHoldInput): Promise<LegalHoldRecord>;
  findById(id: string): Promise<LegalHoldRecord | null>;
  list(filter: { status?: LegalHoldStatus }): Promise<LegalHoldRecord[]>;
  /** Active holds matching any of the given scope refs. */
  findActiveByScopes(scopes: ScopeRef[]): Promise<LegalHoldRecord[]>;
  release(id: string, releasedByUserId: string, releasedAt: Date): Promise<void>;
}
