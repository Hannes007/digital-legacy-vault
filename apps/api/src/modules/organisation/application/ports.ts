import type { OrgMemberRole, OrgMemberStatus } from '../../identity/application/org-ports';
import type { ClientRelationshipStatus, EmergencyScope } from '@dlv/shared-types';

export const CLIENT_RELATIONSHIP_REPOSITORY = Symbol('CLIENT_RELATIONSHIP_REPOSITORY');
export const ORG_DIRECTORY_PORT = Symbol('ORG_DIRECTORY_PORT');
export const ORG_USAGE_PORT = Symbol('ORG_USAGE_PORT');

// --- Client relationships -----------------------------------------------------
export interface ClientRelationshipRecord {
  id: string;
  organisationId: string;
  professionalUserId: string;
  clientUserId: string;
  role: OrgMemberRole;
  scope: EmergencyScope;
  categoryIds: string[];
  status: ClientRelationshipStatus;
  createdAt: Date;
  respondedAt: Date | null;
  revokedAt: Date | null;
}

/** Record enriched with display names for listings. */
export interface ClientRelationshipView extends ClientRelationshipRecord {
  organisationName: string;
  professionalName: string;
  clientEmail: string;
}

export interface CreateClientRelationshipInput {
  id: string;
  organisationId: string;
  professionalUserId: string;
  clientUserId: string;
  role: OrgMemberRole;
  scope: EmergencyScope;
  categoryIds: string[];
}

export interface ClientRelationshipRepository {
  create(input: CreateClientRelationshipInput): Promise<ClientRelationshipRecord>;
  findById(id: string): Promise<ClientRelationshipRecord | null>;
  listByOrg(organisationId: string): Promise<ClientRelationshipView[]>;
  listByClient(clientUserId: string): Promise<ClientRelationshipView[]>;
  /** Any non-terminal (PENDING/ACTIVE) duplicate for the same triple? */
  existsOpen(organisationId: string, professionalUserId: string, clientUserId: string): Promise<boolean>;
  respond(
    id: string,
    status: ClientRelationshipStatus,
    scope: EmergencyScope,
    categoryIds: string[],
    respondedAt: Date,
  ): Promise<void>;
  revoke(id: string, revokedAt: Date): Promise<void>;
}

// --- Org directory (cross-cutting reads over identity tables) ------------------
export interface OrgSummary {
  id: string;
  name: string;
  dataRegion: string;
}
export interface OrgMembership {
  role: OrgMemberRole;
  status: OrgMemberStatus;
}
export interface OrgDirectoryPort {
  findOrg(organisationId: string): Promise<OrgSummary | null>;
  membership(organisationId: string, userId: string): Promise<OrgMembership | null>;
  findUserIdByEmail(email: string): Promise<string | null>;
  updateDataRegion(organisationId: string, dataRegion: string): Promise<void>;
}

// --- Usage metering -------------------------------------------------------------
export interface OrgUsageSnapshot {
  seats: number;
  activeMembers: number;
  documents: number;
  storageBytes: number;
  signaturesThisMonth: number;
  aiRequestsThisMonth: number;
  activeClientRelationships: number;
}
export interface OrgUsagePort {
  snapshot(organisationId: string, monthStart: Date): Promise<OrgUsageSnapshot>;
}
