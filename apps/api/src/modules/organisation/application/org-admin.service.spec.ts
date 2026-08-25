import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { OrgAdminService } from './org-admin.service';

import type {
  ClientRelationshipRepository,
  OrgDirectoryPort,
  OrgUsagePort,
  OrgUsageSnapshot,
} from './ports';
import type { Clock } from '../../../common/time/clock';
import type { AuditService } from '../../audit/audit.service';
import type { OrgMemberRole } from '../../identity/application/org-ports';

const clock: Clock = { now: () => new Date('2026-07-19T12:00:00Z') };
const SNAP: OrgUsageSnapshot = {
  seats: 5, activeMembers: 4, documents: 120, storageBytes: 1024, signaturesThisMonth: 3,
  aiRequestsThisMonth: 40, activeClientRelationships: 7,
};

function harness(role: OrgMemberRole | null, region = 'af-south-1') {
  const audits: string[] = [];
  let savedRegion: string | null = null;
  const directory: OrgDirectoryPort = {
    findOrg: async () => ({ id: 'org1', name: 'Firm', dataRegion: savedRegion ?? region }),
    membership: async () => (role === null ? null : { role, status: 'ACTIVE' }),
    findUserIdByEmail: async () => null,
    updateDataRegion: async (_id, r) => { savedRegion = r; },
  };
  const usagePort: OrgUsagePort = { snapshot: async () => SNAP };
  const relationships = {} as ClientRelationshipRepository;
  const audit = { record: async (e: { eventType: string }) => { audits.push(e.eventType); } } as unknown as AuditService;
  const svc = new OrgAdminService(directory, usagePort, relationships, clock, audit);
  return { svc, audits, region: () => savedRegion };
}

describe('OrgAdminService (Phase 8 metering + residency)', () => {
  it('returns usage to org admins and denies everyone else', async () => {
    const admin = harness('COMPANY_ADMIN');
    expect(await admin.svc.usage('org1', 'u1')).toStrictEqual({ organisationId: 'org1', ...SNAP });
    await expect(harness('LAWYER').svc.usage('org1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(harness(null).svc.usage('org1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('surfaces and updates data residency with auditing', async () => {
    const h = harness('HOSPITAL_ADMIN');
    const before = await h.svc.residency('org1', 'u1');
    expect(before.dataRegion).toBe('af-south-1');
    expect(before.availableRegions).toContain('eu-west-1');

    const after = await h.svc.updateResidency('org1', 'u1', 'eu-west-1');
    expect(after.dataRegion).toBe('eu-west-1');
    expect(h.audits).toStrictEqual(['organisation.residency.updated']);
  });

  it('rejects unknown regions and is a no-op audit-wise when unchanged', async () => {
    const h = harness('COMPANY_ADMIN');
    await expect(h.svc.updateResidency('org1', 'u1', 'us-east-1')).rejects.toBeInstanceOf(BadRequestException);
    await h.svc.updateResidency('org1', 'u1', 'af-south-1');
    expect(h.audits).toHaveLength(0);
  });
});
