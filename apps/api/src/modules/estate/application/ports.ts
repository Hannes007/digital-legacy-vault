import type {
  DeathVerificationStatus,
  EmergencyScope,
  EmergencyStatus,
  RelationshipRole,
} from '@dlv/shared-types';

export const BENEFICIARY_REPOSITORY = Symbol('BENEFICIARY_REPOSITORY');
export const EXECUTOR_REPOSITORY = Symbol('EXECUTOR_REPOSITORY');
export const EMERGENCY_REPOSITORY = Symbol('EMERGENCY_REPOSITORY');
export const DEATH_VERIFICATION_REPOSITORY = Symbol('DEATH_VERIFICATION_REPOSITORY');
export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');

export interface BeneficiaryRecord {
  id: string; ownerId: string; fullName: string; email: string; relationship: string; role: RelationshipRole; createdAt: Date;
}
export interface BeneficiaryRepository {
  create(input: { id: string; ownerId: string; fullName: string; email: string; relationship: string; role: RelationshipRole }): Promise<BeneficiaryRecord>;
  listByOwner(ownerId: string): Promise<BeneficiaryRecord[]>;
  delete(ownerId: string, id: string): Promise<void>;
}

export interface ExecutorRecord {
  id: string; ownerId: string; fullName: string; email: string; role: RelationshipRole; createdAt: Date;
}
export interface ExecutorRepository {
  create(input: { id: string; ownerId: string; fullName: string; email: string; role: RelationshipRole }): Promise<ExecutorRecord>;
  listByOwner(ownerId: string): Promise<ExecutorRecord[]>;
  delete(ownerId: string, id: string): Promise<void>;
}

export interface EmergencyRequestRecord {
  id: string; ownerId: string; requesterId: string; scope: EmergencyScope; categoryIds: string[];
  reason: string; isDeathClaim: boolean; status: EmergencyStatus; delayUntil: Date; createdAt: Date;
}
export interface EmergencyApprovalRecord { approverId: string; medical: boolean; }
export interface EmergencyGrantRecord {
  id: string; requestId: string; granteeId: string; ownerId: string; scope: EmergencyScope;
  categoryIds: string[]; expiresAt: Date; revokedAt: Date | null;
}
export interface EmergencyRepository {
  createRequest(input: Omit<EmergencyRequestRecord, 'createdAt' | 'status'> & { status: EmergencyStatus }): Promise<EmergencyRequestRecord>;
  findRequest(id: string): Promise<EmergencyRequestRecord | null>;
  listRequestsForOwner(ownerId: string): Promise<EmergencyRequestRecord[]>;
  setRequestStatus(id: string, status: EmergencyStatus): Promise<void>;
  listApprovals(requestId: string): Promise<EmergencyApprovalRecord[]>;
  addApproval(requestId: string, approverId: string, medical: boolean): Promise<void>;
  createGrant(input: Omit<EmergencyGrantRecord, 'revokedAt'>): Promise<EmergencyGrantRecord>;
  activeGrantsForGrantee(granteeId: string, now: Date): Promise<EmergencyGrantRecord[]>;
  revokeGrant(id: string, at: Date): Promise<void>;
}

export interface DeathVerificationRecord {
  id: string; subjectUserId: string; claimantId: string; evidenceDocIds: string[];
  status: DeathVerificationStatus; reviewerId: string | null; reviewNotes: string | null; createdAt: Date;
}
export interface DeathVerificationRepository {
  create(input: { id: string; subjectUserId: string; claimantId: string; evidenceDocIds: string[] }): Promise<DeathVerificationRecord>;
  findById(id: string): Promise<DeathVerificationRecord | null>;
  listByStatus(status: DeathVerificationStatus): Promise<DeathVerificationRecord[]>;
  setDecision(id: string, status: DeathVerificationStatus, reviewerId: string, notes: string | null): Promise<void>;
}

/** Owner notifications (non-disableable for emergency alerts, §7.6). Real SES/Twilio in Phase 6. */
export interface NotificationPort {
  notifyOwner(ownerId: string, kind: string, payload: Record<string, unknown>): Promise<void>;
}

// --- Client-relationship reader (Phase 8 — provided by the organisation module)
export const CLIENT_RELATIONSHIP_READER = Symbol('CLIENT_RELATIONSHIP_READER');

/** An ACTIVE professional↔client relationship as the ABAC engine sees it. */
export interface ActiveClientRelationship {
  clientUserId: string;
  scope: EmergencyScope;
  categoryIds: string[];
}
export interface ClientRelationshipReader {
  activeForProfessional(userId: string): Promise<ActiveClientRelationship[]>;
}
