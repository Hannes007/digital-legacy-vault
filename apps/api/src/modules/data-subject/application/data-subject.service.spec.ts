import { DataSubjectRequestStatus, LegalHoldScope, LegalHoldStatus } from '@dlv/shared-types';

import { DataSubjectService } from './data-subject.service';

import type {
  DataSubjectExportData,
  DataSubjectRepository,
  DataSubjectRequestRecord,
  DataSubjectRequestRepository,
  ErasureCounts,
} from './ports';
import type { Clock } from '../../../common/time/clock';
import type { AuditService } from '../../audit/audit.service';
import type { LegalHoldRecord } from '../../legal-hold/application/ports';
import type { LegalHoldService } from '../../legal-hold/application/legal-hold.service';

const audit = { record: async () => undefined } as unknown as AuditService;
const clock: Clock = { now: () => new Date('2026-07-16T10:00:00Z') };

const exportData: DataSubjectExportData = {
  profile: { id: 'user-1', email: 'a@example.com', firstName: 'Ada', lastName: 'L', status: 'ACTIVE', roles: ['PREMIUM_USER'], createdAt: new Date('2026-01-01T00:00:00Z') },
  documents: [{ id: 'doc-1', title: 'Will', type: 'LAST_WILL', status: 'READY', currentVersion: 1, createdAt: new Date() }],
  signatures: [],
  consents: [],
  clientVaultItems: [],
  documentIds: ['doc-1'],
  vaultIds: ['vault-1'],
};

function fakeDataRepo(erased: ErasureCounts, spy: { erased: boolean }) {
  const repo: DataSubjectRepository = {
    exportData: async () => exportData,
    gatherScope: async () => ({ documentIds: exportData.documentIds, vaultIds: exportData.vaultIds }),
    eraseData: async () => {
      spy.erased = true;
      return erased;
    },
  };
  return repo;
}

function fakeRequestRepo() {
  const store: DataSubjectRequestRecord[] = [];
  const repo: DataSubjectRequestRepository = {
    create: async (input) => {
      const rec: DataSubjectRequestRecord = { ...input, status: DataSubjectRequestStatus.PENDING, detail: null, completedAt: null, createdAt: new Date() };
      store.push(rec);
      return rec;
    },
    complete: async (id, status, detail, completedAt) => {
      const rec = store.find((r) => r.id === id);
      if (rec) Object.assign(rec, { status, detail, completedAt });
    },
    listByUser: async (userId) => store.filter((r) => r.userId === userId),
  };
  return { repo, store };
}

function holdsStub(holds: LegalHoldRecord[]): LegalHoldService {
  return { resolveActiveHolds: async () => holds } as unknown as LegalHoldService;
}

describe('DataSubjectService', () => {
  it('produces a portable export bundle', async () => {
    const spy = { erased: false };
    const { repo: reqRepo } = fakeRequestRepo();
    const svc = new DataSubjectService(fakeDataRepo({ documentVersionsShredded: 0, clientVaultItemsDeleted: 0, sessionsRevoked: 0 }, spy), reqRepo, holdsStub([]), clock, audit);
    const bundle = await svc.exportData('user-1');
    expect(bundle.profile.email).toBe('a@example.com');
    expect(bundle.documents).toHaveLength(1);
  });

  it('completes erasure when no legal hold applies', async () => {
    const spy = { erased: false };
    const { repo: reqRepo, store } = fakeRequestRepo();
    const svc = new DataSubjectService(
      fakeDataRepo({ documentVersionsShredded: 2, clientVaultItemsDeleted: 1, sessionsRevoked: 3 }, spy),
      reqRepo,
      holdsStub([]),
      clock,
      audit,
    );
    const result = await svc.requestErasure('user-1');
    expect(result.status).toBe(DataSubjectRequestStatus.COMPLETED);
    expect(spy.erased).toBe(true);
    expect(store[0]?.status).toBe(DataSubjectRequestStatus.COMPLETED);
  });

  it('refuses erasure while a legal hold applies and does not erase', async () => {
    const spy = { erased: false };
    const { repo: reqRepo } = fakeRequestRepo();
    const hold: LegalHoldRecord = {
      id: 'hold-1',
      scopeType: LegalHoldScope.DOCUMENT,
      scopeId: 'doc-1',
      reason: 'litigation',
      reference: null,
      status: LegalHoldStatus.ACTIVE,
      placedByUserId: 'admin-1',
      placedAt: new Date(),
      releasedByUserId: null,
      releasedAt: null,
      createdAt: new Date(),
    };
    const svc = new DataSubjectService(
      fakeDataRepo({ documentVersionsShredded: 0, clientVaultItemsDeleted: 0, sessionsRevoked: 0 }, spy),
      reqRepo,
      holdsStub([hold]),
      clock,
      audit,
    );
    const result = await svc.requestErasure('user-1');
    expect(result.status).toBe(DataSubjectRequestStatus.REFUSED);
    expect(result.blockingHolds).toHaveLength(1);
    expect(spy.erased).toBe(false);
  });
});
