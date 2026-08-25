import type { DataSubjectRequestStatus, DataSubjectRequestType } from '../common/dsr-enums.js';

/** Audit record of a data-subject request (Phase 5). */
export interface DataSubjectRequestDto {
  id: string;
  type: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  detail: string | null;
  requestedAt: string; // ISO 8601 UTC
  completedAt: string | null;
  createdAt: string;
}

/** A portable export bundle of the subject's personal data (POPIA/GDPR). */
export interface DataSubjectExportDto {
  generatedAt: string;
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    roles: string[];
    createdAt: string;
  };
  documents: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    currentVersion: number;
    createdAt: string;
  }>;
  signatures: Array<{
    id: string;
    requestId: string;
    method: string;
    sealDigest: string;
    createdAt: string;
  }>;
  consents: Array<{
    id: string;
    purpose: string;
    status: string;
    grantedAt: string;
    withdrawnAt: string | null;
  }>;
  clientVaultItems: Array<{ id: string; label: string; createdAt: string }>;
  legalHolds: Array<{ id: string; scopeType: string; reason: string; status: string }>;
}

/** Outcome of an erasure attempt (may be refused when a legal hold applies). */
export interface ErasureResultDto {
  requestId: string;
  status: DataSubjectRequestStatus;
  /** Human-readable outcome (e.g. what was erased, or why it was refused). */
  detail: string;
  /** Legal holds that blocked erasure, if any. */
  blockingHolds: Array<{ id: string; scopeType: string; scopeId: string; reason: string }>;
}
