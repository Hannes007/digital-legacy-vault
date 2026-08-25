import {
  InviteeNotRegisteredError,
  LastOrgAdminError,
  NotOrganisationMemberError,
  OrgAdminRequiredError,
  OrgMembershipExistsError,
} from '../domain/errors/organisation.errors';

import { OrganisationService } from './organisation.service';

import type {
  OrgMemberRecord,
  OrganisationMemberRepository,
  OrganisationRepository,
} from './org-ports';
import type { UserRepository } from './ports';
import type { AuditService } from '../../audit/audit.service';

const ip = '1.2.x.x';

function build() {
  const orgs = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    listByIds: jest.fn(),
  } as jest.Mocked<OrganisationRepository>;
  const members = {
    create: jest.fn(),
    findByOrgAndUser: jest.fn(),
    listByUser: jest.fn(),
    listByOrg: jest.fn(),
    updateRole: jest.fn(),
    updateStatus: jest.fn(),
    countAdmins: jest.fn(),
  } as jest.Mocked<OrganisationMemberRepository>;
  const users = { findByEmail: jest.fn() } as unknown as jest.Mocked<UserRepository>;
  const audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
  return { service: new OrganisationService(orgs, members, users, audit), orgs, members, users };
}

function member(overrides: Partial<OrgMemberRecord> = {}): OrgMemberRecord {
  return {
    id: 'm1',
    organisationId: 'org1',
    userId: 'u1',
    role: 'COMPANY_ADMIN',
    status: 'ACTIVE',
    createdAt: new Date('2026-07-06T12:00:00.000Z'),
    ...overrides,
  };
}

describe('OrganisationService authorisation', () => {
  it('creates an org and makes the creator an admin member', async () => {
    const { service, orgs, members } = build();
    orgs.create.mockResolvedValue({
      id: 'org1',
      name: 'Acme',
      orgType: 'COMPANY',
      billingEmail: 'billing@acme.test',
      verificationStatus: 'PENDING',
      createdAt: new Date('2026-07-06T12:00:00.000Z'),
    });
    const dto = await service.create('u1', { name: 'Acme', orgType: 'COMPANY', billingEmail: 'billing@acme.test' }, ip);
    expect(dto.myRole).toBe('COMPANY_ADMIN');
    expect(members.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', role: 'COMPANY_ADMIN', status: 'ACTIVE' }),
    );
  });

  it('blocks non-members from reading an org', async () => {
    const { service, members } = build();
    members.findByOrgAndUser.mockResolvedValue(null);
    await expect(service.get('stranger', 'org1')).rejects.toBeInstanceOf(NotOrganisationMemberError);
  });

  it('blocks non-admins from inviting', async () => {
    const { service, members } = build();
    members.findByOrgAndUser.mockResolvedValue(member({ role: 'MEMBER' }));
    await expect(
      service.invite('u1', 'org1', { email: 'x@y.test', role: 'MEMBER' }, ip),
    ).rejects.toBeInstanceOf(OrgAdminRequiredError);
  });

  it('rejects inviting a non-registered email', async () => {
    const { service, members, users } = build();
    members.findByOrgAndUser.mockResolvedValue(member());
    users.findByEmail.mockResolvedValue(null);
    await expect(
      service.invite('u1', 'org1', { email: 'ghost@y.test', role: 'MEMBER' }, ip),
    ).rejects.toBeInstanceOf(InviteeNotRegisteredError);
  });

  it('rejects inviting an existing active member', async () => {
    const { service, members, users } = build();
    members.findByOrgAndUser
      .mockResolvedValueOnce(member()) // actor admin
      .mockResolvedValueOnce(member({ userId: 'u2', status: 'ACTIVE' })); // invitee exists
    users.findByEmail.mockResolvedValue({ id: 'u2', email: 'u2@y.test', firstName: 'U', lastName: 'Two' } as never);
    await expect(
      service.invite('u1', 'org1', { email: 'u2@y.test', role: 'MEMBER' }, ip),
    ).rejects.toBeInstanceOf(OrgMembershipExistsError);
  });

  it('refuses to remove the last admin', async () => {
    const { service, members } = build();
    members.findByOrgAndUser
      .mockResolvedValueOnce(member()) // actor admin
      .mockResolvedValueOnce(member({ userId: 'u1' })); // target (same admin)
    members.countAdmins.mockResolvedValue(1);
    await expect(service.removeMember('u1', 'org1', 'u1', ip)).rejects.toBeInstanceOf(LastOrgAdminError);
  });
});
