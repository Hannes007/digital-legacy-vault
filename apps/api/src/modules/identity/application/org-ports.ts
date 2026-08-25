/**
 * Application-layer ports for the organisation sub-domain of the identity
 * context (PROJECT_MEMORY §4 — identity owns users, orgs, auth, roles).
 */

export type OrgType =
  | 'LAW_FIRM'
  | 'HOSPITAL'
  | 'INSURER'
  | 'FINANCIAL_ADVISORY'
  | 'COMPANY'
  | 'FAMILY';

export type OrgMemberRole =
  | 'COMPANY_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'LAWYER'
  | 'DOCTOR'
  | 'FINANCIAL_ADVISER'
  | 'MEMBER';

export type OrgMemberStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

export interface OrganisationRecord {
  id: string;
  name: string;
  orgType: OrgType;
  billingEmail: string;
  verificationStatus: string;
  createdAt: Date;
}

export interface CreateOrganisationInput {
  id: string;
  name: string;
  orgType: OrgType;
  billingEmail: string;
}

export interface OrganisationRepository {
  create(input: CreateOrganisationInput): Promise<OrganisationRecord>;
  findById(id: string): Promise<OrganisationRecord | null>;
  update(id: string, data: { name?: string; billingEmail?: string }): Promise<void>;
  listByIds(ids: string[]): Promise<OrganisationRecord[]>;
}
export const ORGANISATION_REPOSITORY = Symbol('ORGANISATION_REPOSITORY');

export interface OrgMemberRecord {
  id: string;
  organisationId: string;
  userId: string;
  role: OrgMemberRole;
  status: OrgMemberStatus;
  createdAt: Date;
}

/** Member row joined with basic user identity for listing. */
export interface OrgMemberWithUser extends OrgMemberRecord {
  email: string;
  firstName: string;
  lastName: string;
}

export interface CreateOrgMemberInput {
  id: string;
  organisationId: string;
  userId: string;
  role: OrgMemberRole;
  status: OrgMemberStatus;
  invitedByUserId?: string;
}

export interface OrganisationMemberRepository {
  create(input: CreateOrgMemberInput): Promise<void>;
  findByOrgAndUser(organisationId: string, userId: string): Promise<OrgMemberRecord | null>;
  listByUser(userId: string, statuses: OrgMemberStatus[]): Promise<OrgMemberRecord[]>;
  listByOrg(organisationId: string): Promise<OrgMemberWithUser[]>;
  updateRole(id: string, role: OrgMemberRole): Promise<void>;
  updateStatus(id: string, status: OrgMemberStatus): Promise<void>;
  countAdmins(organisationId: string): Promise<number>;
}
export const ORGANISATION_MEMBER_REPOSITORY = Symbol('ORGANISATION_MEMBER_REPOSITORY');
