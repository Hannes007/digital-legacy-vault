import type { ClientRelationshipStatus, DataRegion } from '../common/organisation-enums.js';
import type { EmergencyScope } from '../common/estate-enums.js';

/** A professional↔client vault relationship (Phase 8). */
export interface ClientRelationshipDto {
  id: string;
  organisationId: string;
  organisationName: string;
  professionalUserId: string;
  professionalName: string;
  clientUserId: string;
  clientEmail: string;
  role: string;
  scope: EmergencyScope;
  categoryIds: string[];
  status: ClientRelationshipStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface CreateClientRelationshipRequest {
  clientEmail: string;
  scope?: EmergencyScope;
  categoryIds?: string[];
}

export interface RespondClientRelationshipRequest {
  /** Client may narrow the scope when accepting (never widen). */
  scope?: EmergencyScope;
  categoryIds?: string[];
}

/** Per-organisation usage metering for org billing (Phase 8). */
export interface OrgUsageDto {
  organisationId: string;
  seats: number;
  activeMembers: number;
  documents: number;
  storageBytes: number;
  signaturesThisMonth: number;
  aiRequestsThisMonth: number;
  activeClientRelationships: number;
}

export interface ResidencyDto {
  organisationId: string;
  dataRegion: DataRegion;
  /** Regions the platform can offer today. */
  availableRegions: DataRegion[];
}
export interface UpdateResidencyRequest {
  dataRegion: DataRegion;
}

/** SSO connection as shown to org admins — the client secret is never returned. */
export interface SsoConnectionDto {
  organisationId: string;
  issuerUrl: string;
  clientId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  emailDomains: string[];
  defaultMemberRole: string;
  enabled: boolean;
  /** True when a client secret is stored. */
  hasClientSecret: boolean;
}

export interface UpsertSsoConnectionRequest {
  issuerUrl: string;
  clientId: string;
  /** Omit to keep the stored secret. */
  clientSecret?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  emailDomains: string[];
  defaultMemberRole?: string;
  enabled?: boolean;
}

/** Response of GET /auth/sso/start — the browser redirects here. */
export interface SsoStartDto {
  authorizationUrl: string;
}
