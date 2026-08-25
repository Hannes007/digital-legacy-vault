import type {
  DeathVerificationStatus,
  EmergencyScope,
  EmergencyStatus,
  RelationshipRole,
} from '../common/estate-enums.js';

export interface BeneficiaryDto {
  id: string;
  ownerId: string;
  fullName: string;
  email: string;
  relationship: string;
  role: RelationshipRole;
  createdAt: string;
}

export interface CreateBeneficiaryRequest {
  fullName: string;
  email: string;
  relationship: string;
  role?: RelationshipRole;
}

export interface ExecutorDto {
  id: string;
  ownerId: string;
  fullName: string;
  email: string;
  role: RelationshipRole;
  createdAt: string;
}

export interface CreateExecutorRequest {
  fullName: string;
  email: string;
}

export interface EmergencyAccessRequestDto {
  id: string;
  ownerId: string;
  requesterId: string;
  scope: EmergencyScope;
  categoryIds: string[];
  reason: string;
  isDeathClaim: boolean;
  status: EmergencyStatus;
  delayUntil: string;
  approvalCount: number;
  createdAt: string;
}

export interface CreateEmergencyAccessRequest {
  ownerId: string;
  scope?: EmergencyScope;
  categoryIds?: string[];
  reason: string;
  isDeathClaim?: boolean;
}

export interface EmergencyAccessGrantDto {
  id: string;
  requestId: string;
  granteeId: string;
  ownerId: string;
  scope: EmergencyScope;
  categoryIds: string[];
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface DeathVerificationDto {
  id: string;
  subjectUserId: string;
  claimantId: string;
  evidenceDocIds: string[];
  status: DeathVerificationStatus;
  reviewerId: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

export interface SubmitDeathVerificationRequest {
  subjectUserId: string;
  evidenceDocIds: string[];
}
