import type { DataSubjectRequestStatus, DataSubjectRequestType } from '@dlv/shared-types';

export const DATA_SUBJECT_REPOSITORY = Symbol('DATA_SUBJECT_REPOSITORY');
export const DATA_SUBJECT_REQUEST_REPOSITORY = Symbol('DATA_SUBJECT_REQUEST_REPOSITORY');

/** Aggregated personal-data read model for a portability export (POPIA/GDPR). */
export interface DataSubjectExportData {
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    roles: string[];
    createdAt: Date;
  };
  documents: Array<{ id: string; title: string; type: string; status: string; currentVersion: number; createdAt: Date }>;
  signatures: Array<{ id: string; requestId: string; method: string; sealDigest: string; createdAt: Date }>;
  consents: Array<{ id: string; purpose: string; status: string; grantedAt: Date; withdrawnAt: Date | null }>;
  clientVaultItems: Array<{ id: string; label: string; createdAt: Date }>;
  /** Scope used by the erasure path to test for legal holds. */
  documentIds: string[];
  vaultIds: string[];
}

/** What an erasure crypto-shredded / deleted (for the audit trail). */
export interface ErasureCounts {
  documentVersionsShredded: number;
  clientVaultItemsDeleted: number;
  sessionsRevoked: number;
}

export interface DataSubjectRepository {
  exportData(userId: string): Promise<DataSubjectExportData>;
  /** Resolve the subject's document and vault ids (for hold resolution). */
  gatherScope(userId: string): Promise<{ documentIds: string[]; vaultIds: string[] }>;
  /**
   * Crypto-erasure honouring S3 Object Lock: destroys the wrapped DEKs (rendering
   * WORM-retained ciphertext unrecoverable), deletes zero-knowledge client-vault
   * items, revokes sessions, and anonymises the profile — all in one transaction.
   */
  eraseData(userId: string, now: Date): Promise<ErasureCounts>;
}

export interface DataSubjectRequestRecord {
  id: string;
  userId: string;
  type: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  detail: string | null;
  requestedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface DataSubjectRequestRepository {
  create(input: { id: string; userId: string; type: DataSubjectRequestType; requestedAt: Date }): Promise<DataSubjectRequestRecord>;
  complete(id: string, status: DataSubjectRequestStatus, detail: string | null, completedAt: Date): Promise<void>;
  listByUser(userId: string): Promise<DataSubjectRequestRecord[]>;
}
