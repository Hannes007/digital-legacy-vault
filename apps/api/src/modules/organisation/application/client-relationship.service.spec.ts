import { ClientRelationshipStatus, EmergencyScope } from '@dlv/shared-types';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

import { ClientRelationshipService } from './client-relationship.service';

import type {
  ClientRelationshipRecord,
  ClientRelationshipRepository,
  ClientRelationshipView,
  OrgDirectoryPort,
} from './ports';
import type { Clock } from '../../../common/time/clock';
import type { AuditService } from '../../audit/audit.service';
import type { ConsentRecorder } from '../../consent/application/ports';
import type { OrgMemberRole } from '../../identity/application/org-ports';

const NOW = new Date('2026-07-19T12:00:00Z');
const clock: Clock = { now: () => NOW };

function record(overrides: Partial<ClientRelationshipRecord> = {}): ClientRelationshipRecord {
  return {
    id: 'rel1', organisationId: 'org1', professionalUserId: 'pro1', clientUserId: 'client1',
    role: 'LAWYER', scope: EmergencyScope.FULL, categoryIds: [],
    status: ClientRelationshipStatus.PENDING, createdAt: NOW, respondedAt: null, revokedAt: null,
    ...overrides,
  };
}

interface Harness {
  svc: ClientRelationshipService;
  audits: string[];
  consents: number;
  responded: Array<{ status: ClientRelationshipStatus; scope: EmergencyScope }>;
  revoked: string[];
  createdCount: () => number;
}

function harness(opts: {
  memberRole?: OrgMemberRole | null;
  clientId?: string | null;
  existing?: ClientRelationshipRecord | null;
  open?: boolean;
} = {}): Harness {
  const audits: string[] = [];
  const responded: Harness['responded'] = [];
  const revoked: string[] = [];
  let consents = 0;
  let created = 0;

  const relationships: ClientRelationshipRepository = {
    create: async () => { created += 1; return record(); },
    findById: async () => opts.existing ?? null,
    listByOrg: async () => [record() as ClientRelationshipView],
    listByClient: async () => [],
    existsOpen: async () => opts.open ?? false,
    respond: async (_id, status, scope) => { responded.push({ status, scope }); },
    revoke: async (id) => { revoked.push(id); },
  };
  const directory: OrgDirectoryPort = {
    findOrg: async () => ({ id: 'org1', name: 'Firm', dataRegion: 'af-south-1' }),
    membership: async () =>
      opts.memberRole === null ? null : { role: opts.memberRole ?? 'LAWYER', status: 'ACTIVE' },
    findUserIdByEmail: async () => (opts.clientId === undefined ? 'client1' : opts.clientId),
    updateDataRegion: async () => undefined,
  };
  const consent: ConsentRecorder = {
    record: async () => { consents += 1; return {} as never; },
  };
  const audit = { record: async (e: { eventType: string }) => { audits.push(e.eventType); } } as unknown as AuditService;

  const svc = new ClientRelationshipService(relationships, directory, consent, clock, audit);
  return { svc, audits, get consents() { return consents; }, responded, revoked, createdCount: () => created };
}

describe('ClientRelationshipService (Phase 8)', () => {
  it('lets a professional request access and audits it', async () => {
    const h = harness();
    await h.svc.request('org1', 'pro1', 'client@example.com', EmergencyScope.FULL, []);
    expect(h.createdCount()).toBe(1);
    expect(h.audits).toStrictEqual(['organisation.client_access.requested']);
  });

  it('blocks non-professional members and duplicate open requests', async () => {
    await expect(
      harness({ memberRole: 'MEMBER' }).svc.request('org1', 'pro1', 'c@example.com', EmergencyScope.FULL, []),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      harness({ open: true }).svc.request('org1', 'pro1', 'c@example.com', EmergencyScope.FULL, []),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not reveal whether a client account exists (no enumeration)', async () => {
    const h = harness({ clientId: null });
    await expect(
      h.svc.request('org1', 'pro1', 'ghost@example.com', EmergencyScope.FULL, []),
    ).resolves.toBeUndefined();
    expect(h.createdCount()).toBe(0);
  });

  it('accept records consent first and activates with the client-chosen scope', async () => {
    const h = harness({ existing: record() });
    await h.svc.respond('rel1', 'client1', true, EmergencyScope.MEDICAL_ONLY);
    expect(h.responded).toStrictEqual([
      { status: ClientRelationshipStatus.ACTIVE, scope: EmergencyScope.MEDICAL_ONLY },
    ]);
    expect((h as unknown as { consents: number }).consents).toBe(1);
    expect(h.audits).toStrictEqual(['organisation.client_access.accepted']);
  });

  it('decline needs no consent; only the client may respond; CATEGORY needs categories', async () => {
    const h = harness({ existing: record() });
    await h.svc.respond('rel1', 'client1', false);
    expect((h as unknown as { consents: number }).consents).toBe(0);

    await expect(
      harness({ existing: record() }).svc.respond('rel1', 'intruder', true),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      harness({ existing: record() }).svc.respond('rel1', 'client1', true, EmergencyScope.CATEGORY, []),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('client, professional, and org admin can revoke; strangers cannot', async () => {
    const active = record({ status: ClientRelationshipStatus.ACTIVE });
    await harness({ existing: active }).svc.revoke('rel1', 'client1');
    await harness({ existing: active }).svc.revoke('rel1', 'pro1');
    await harness({ existing: active, memberRole: 'COMPANY_ADMIN' }).svc.revoke('rel1', 'admin1');
    await expect(
      harness({ existing: active, memberRole: null }).svc.revoke('rel1', 'stranger'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
