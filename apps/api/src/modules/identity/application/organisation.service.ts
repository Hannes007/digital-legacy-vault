import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { AuditService } from '../../audit/audit.service';
import {
  InviteeNotRegisteredError,
  LastOrgAdminError,
  NoPendingInvitationError,
  NotOrganisationMemberError,
  OrgAdminRequiredError,
  OrgMemberNotFoundError,
  OrgMembershipExistsError,
  OrganisationNotFoundError,
} from '../domain/errors/organisation.errors';
import { Email } from '../domain/value-objects/email';

import {
  ORGANISATION_MEMBER_REPOSITORY,
  ORGANISATION_REPOSITORY,
  type OrgMemberRecord,
  type OrgMemberRole,
  type OrgType,
  type OrganisationMemberRepository,
  type OrganisationRecord,
  type OrganisationRepository,
} from './org-ports';
import { USER_REPOSITORY, type UserRepository } from './ports';

/** Roles that may administer an organisation. */
const ADMIN_ROLES: ReadonlySet<OrgMemberRole> = new Set(['COMPANY_ADMIN', 'HOSPITAL_ADMIN']);

function isAdminRole(role: OrgMemberRole): boolean {
  return ADMIN_ROLES.has(role);
}

/** The admin role a creator receives, chosen by organisation type. */
function adminRoleForType(orgType: OrgType): OrgMemberRole {
  return orgType === 'HOSPITAL' ? 'HOSPITAL_ADMIN' : 'COMPANY_ADMIN';
}

export interface OrganisationDto {
  id: string;
  name: string;
  orgType: OrgType;
  billingEmail: string;
  verificationStatus: string;
  createdAt: string;
  myRole: OrgMemberRole;
}

export interface OrgMemberDto {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: OrgMemberRole;
  status: string;
  createdAt: string;
}

/**
 * Organisation foundation (roadmap Phase 2 — org model foundation; full B2B
 * workspaces land in Phase 8). Covers create, membership, invitations and
 * role management with member/admin authorisation and audit trails.
 */
@Injectable()
export class OrganisationService {
  constructor(
    @Inject(ORGANISATION_REPOSITORY) private readonly orgs: OrganisationRepository,
    @Inject(ORGANISATION_MEMBER_REPOSITORY) private readonly members: OrganisationMemberRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    input: { name: string; orgType: OrgType; billingEmail: string },
    ipMasked: string,
  ): Promise<OrganisationDto> {
    const orgId = uuidv7();
    const org = await this.orgs.create({
      id: orgId,
      name: input.name.trim(),
      orgType: input.orgType,
      billingEmail: Email.create(input.billingEmail).value,
    });
    const role = adminRoleForType(input.orgType);
    await this.members.create({
      id: uuidv7(),
      organisationId: orgId,
      userId,
      role,
      status: 'ACTIVE',
    });
    await this.audit.record({
      actorUserId: userId,
      eventType: 'org.created',
      resource: `org:${orgId}`,
      ipMasked,
      payload: { orgType: input.orgType },
    });
    return this.toOrgDto(org, role);
  }

  async listMine(userId: string): Promise<OrganisationDto[]> {
    const memberships = await this.members.listByUser(userId, ['ACTIVE']);
    if (memberships.length === 0) {
      return [];
    }
    const roleByOrg = new Map(memberships.map((m) => [m.organisationId, m.role]));
    const orgs = await this.orgs.listByIds([...roleByOrg.keys()]);
    return orgs.map((o) => this.toOrgDto(o, roleByOrg.get(o.id) ?? 'MEMBER'));
  }

  async get(userId: string, orgId: string): Promise<OrganisationDto> {
    const membership = await this.requireActiveMember(orgId, userId);
    const org = await this.orgs.findById(orgId);
    if (!org) {
      throw new OrganisationNotFoundError();
    }
    return this.toOrgDto(org, membership.role);
  }

  async update(
    userId: string,
    orgId: string,
    data: { name?: string; billingEmail?: string },
    ipMasked: string,
  ): Promise<OrganisationDto> {
    const membership = await this.requireAdmin(orgId, userId);
    const patch: { name?: string; billingEmail?: string } = {};
    if (data.name !== undefined) {
      patch.name = data.name.trim();
    }
    if (data.billingEmail !== undefined) {
      patch.billingEmail = Email.create(data.billingEmail).value;
    }
    await this.orgs.update(orgId, patch);
    await this.audit.record({
      actorUserId: userId,
      eventType: 'org.updated',
      resource: `org:${orgId}`,
      ipMasked,
      payload: { fields: Object.keys(patch) },
    });
    const org = await this.orgs.findById(orgId);
    if (!org) {
      throw new OrganisationNotFoundError();
    }
    return this.toOrgDto(org, membership.role);
  }

  async invite(
    actorUserId: string,
    orgId: string,
    input: { email: string; role: OrgMemberRole },
    ipMasked: string,
  ): Promise<OrgMemberDto> {
    await this.requireAdmin(orgId, actorUserId);
    const email = Email.create(input.email);
    const invitee = await this.users.findByEmail(email.value);
    if (!invitee) {
      throw new InviteeNotRegisteredError();
    }
    const existing = await this.members.findByOrgAndUser(orgId, invitee.id);
    if (existing && existing.status !== 'REMOVED') {
      throw new OrgMembershipExistsError();
    }
    const memberId = uuidv7();
    await this.members.create({
      id: memberId,
      organisationId: orgId,
      userId: invitee.id,
      role: input.role,
      status: 'INVITED',
      invitedByUserId: actorUserId,
    });
    await this.audit.record({
      actorUserId,
      eventType: 'org.member_invited',
      resource: `org:${orgId}`,
      ipMasked,
      payload: { inviteeUserId: invitee.id, role: input.role },
    });
    return {
      id: memberId,
      userId: invitee.id,
      email: invitee.email,
      firstName: invitee.firstName,
      lastName: invitee.lastName,
      role: input.role,
      status: 'INVITED',
      createdAt: new Date().toISOString(),
    };
  }

  async acceptInvite(userId: string, orgId: string, ipMasked: string): Promise<void> {
    const membership = await this.members.findByOrgAndUser(orgId, userId);
    if (!membership || membership.status !== 'INVITED') {
      throw new NoPendingInvitationError();
    }
    await this.members.updateStatus(membership.id, 'ACTIVE');
    await this.audit.record({
      actorUserId: userId,
      eventType: 'org.invite_accepted',
      resource: `org:${orgId}`,
      ipMasked,
      payload: {},
    });
  }

  async listMembers(userId: string, orgId: string): Promise<OrgMemberDto[]> {
    await this.requireActiveMember(orgId, userId);
    const rows = await this.members.listByOrg(orgId);
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      role: r.role,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async changeMemberRole(
    actorUserId: string,
    orgId: string,
    targetUserId: string,
    role: OrgMemberRole,
    ipMasked: string,
  ): Promise<void> {
    await this.requireAdmin(orgId, actorUserId);
    const target = await this.members.findByOrgAndUser(orgId, targetUserId);
    if (!target || target.status === 'REMOVED') {
      throw new OrgMemberNotFoundError();
    }
    // Never leave the org without an admin.
    if (isAdminRole(target.role) && !isAdminRole(role) && (await this.members.countAdmins(orgId)) <= 1) {
      throw new LastOrgAdminError();
    }
    await this.members.updateRole(target.id, role);
    await this.audit.record({
      actorUserId,
      eventType: 'org.member_role_changed',
      resource: `org:${orgId}`,
      ipMasked,
      payload: { targetUserId, role },
    });
  }

  async removeMember(
    actorUserId: string,
    orgId: string,
    targetUserId: string,
    ipMasked: string,
  ): Promise<void> {
    await this.requireAdmin(orgId, actorUserId);
    const target = await this.members.findByOrgAndUser(orgId, targetUserId);
    if (!target || target.status === 'REMOVED') {
      throw new OrgMemberNotFoundError();
    }
    if (isAdminRole(target.role) && (await this.members.countAdmins(orgId)) <= 1) {
      throw new LastOrgAdminError();
    }
    await this.members.updateStatus(target.id, 'REMOVED');
    await this.audit.record({
      actorUserId,
      eventType: 'org.member_removed',
      resource: `org:${orgId}`,
      ipMasked,
      payload: { targetUserId },
    });
  }

  private async requireActiveMember(orgId: string, userId: string): Promise<OrgMemberRecord> {
    const membership = await this.members.findByOrgAndUser(orgId, userId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new NotOrganisationMemberError();
    }
    return membership;
  }

  private async requireAdmin(orgId: string, userId: string): Promise<OrgMemberRecord> {
    const membership = await this.requireActiveMember(orgId, userId);
    if (!isAdminRole(membership.role)) {
      throw new OrgAdminRequiredError();
    }
    return membership;
  }

  private toOrgDto(org: OrganisationRecord, myRole: OrgMemberRole): OrganisationDto {
    return {
      id: org.id,
      name: org.name,
      orgType: org.orgType,
      billingEmail: org.billingEmail,
      verificationStatus: org.verificationStatus,
      createdAt: org.createdAt.toISOString(),
      myRole,
    };
  }
}
