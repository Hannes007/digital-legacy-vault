import type { ConsentPurpose, ConsentStatus } from '@dlv/shared-types';

export const CONSENT_REPOSITORY = Symbol('CONSENT_REPOSITORY');
/** Cross-context port so other modules (e.g. signature) can emit a consent. */
export const CONSENT_RECORDER = Symbol('CONSENT_RECORDER');

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  statementText: string;
  statementVersion: string;
  sourceContext: string | null;
  ipMasked: string | null;
  userAgent: string | null;
  grantedAt: Date;
  withdrawnAt: Date | null;
  createdAt: Date;
}

export interface CreateConsentInput {
  id: string;
  userId: string;
  purpose: ConsentPurpose;
  statementText: string;
  statementVersion: string;
  sourceContext: string | null;
  ipMasked: string | null;
  userAgent: string | null;
  grantedAt: Date;
}

export interface ConsentRepository {
  create(input: CreateConsentInput): Promise<ConsentRecord>;
  findById(id: string): Promise<ConsentRecord | null>;
  listByUser(userId: string): Promise<ConsentRecord[]>;
  withdraw(id: string, withdrawnAt: Date): Promise<void>;
}

/** Input for recording a consent from any bounded context. */
export interface RecordConsentInput {
  userId: string;
  purpose: ConsentPurpose;
  statementText: string;
  statementVersion?: string | undefined;
  sourceContext?: string | null;
  ipMasked?: string | null;
  userAgent?: string | null;
  grantedAt: Date;
}

/** Narrow port other contexts depend on to record consent (no HTTP surface). */
export interface ConsentRecorder {
  record(input: RecordConsentInput): Promise<ConsentRecord>;
}
