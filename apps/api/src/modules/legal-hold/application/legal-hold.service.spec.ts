import { LegalHoldScope, LegalHoldStatus, Role } from '@dlv/shared-types';
import { ForbiddenException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { LegalHoldService } from './legal-hold.service';

import type { LegalHoldRecord, LegalHoldRepository, ScopeRef } from './ports';
import type { Clock } from '../../../common/time/clock';
import type { AuditService } from '../../audit/audit.service';

const audit = { record: async () => undefined } as unknown as AuditService;
const clock: Clock = { now: () => new Date('2026-07-16T10:00:00Z') };

function fakeRepo() {
  const store = new Map<string, LegalHoldRecord>();
  const repo: LegalHoldRepository = {
    create: async (input) => {
      const rec: LegalHoldRecord = { ...input, status: LegalHoldStatus.ACTIVE, releasedByUserId: null, releasedAt: null, createdAt: new Date() };
      store.set(rec.id, rec);
      return rec;
    },
    findById: async (id) => store.get(id) ?? null,
    list: async ({ status }) => [...store.values()].filter((h) => (status ? h.status === status : true)),
    findActiveByScopes: async (scopes: ScopeRef[]) =>
      [...store.values()].filter(
        (h) => h.status === LegalHoldStatus.ACTIVE && scopes.some((s) => s.scopeType === h.scopeType && s.scopeId === h.scopeId),
      ),
    release: async (id, releasedByUserId, releasedAt) => {
      const rec = store.get(id);
      if (rec) store.set(id, { ...rec, status: LegalHoldStatus.RELEASED, releasedByUserId, releasedAt });
    },
  };
  return { repo, store };
}

const admin = { userId: 'admin-1', roles: [Role.SYSTEM_ADMIN] };
const nonAdmin = { userId: 'user-1', roles: [Role.PREMIUM_USER] };

describe('LegalHoldService', () => {
  it('lets a compliance admin place a hold and refuses non-admins', async () => {
    const { repo } = fakeRepo();
    const svc = new LegalHoldService(repo, clock, audit);
    const hold = await svc.place(admin, { scopeType: LegalHoldScope.USER, scopeId: uuidv7(), reason: 'Litigation X' });
    expect(hold.status).toBe(LegalHoldStatus.ACTIVE);
    await expect(
      svc.place(nonAdmin, { scopeType: LegalHoldScope.USER, scopeId: uuidv7(), reason: 'nope' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('resolves active holds affecting a subject by user, document or vault scope', async () => {
    const { repo } = fakeRepo();
    const svc = new LegalHoldService(repo, clock, audit);
    const userId = uuidv7();
    const docId = uuidv7();
    await svc.place(admin, { scopeType: LegalHoldScope.DOCUMENT, scopeId: docId, reason: 'preserve doc' });

    const affecting = await svc.resolveActiveHolds({ userId, documentIds: [docId], vaultIds: [] });
    expect(affecting).toHaveLength(1);

    const none = await svc.resolveActiveHolds({ userId, documentIds: [uuidv7()], vaultIds: [] });
    expect(none).toHaveLength(0);
  });

  it('excludes released holds from resolution', async () => {
    const { repo } = fakeRepo();
    const svc = new LegalHoldService(repo, clock, audit);
    const userId = uuidv7();
    const hold = await svc.place(admin, { scopeType: LegalHoldScope.USER, scopeId: userId, reason: 'x' });
    await svc.release(admin, hold.id);
    const affecting = await svc.resolveActiveHolds({ userId, documentIds: [], vaultIds: [] });
    expect(affecting).toHaveLength(0);
  });

  it('lets auditors read but not place holds', async () => {
    const { repo } = fakeRepo();
    const svc = new LegalHoldService(repo, clock, audit);
    const auditor = { userId: 'aud-1', roles: [Role.AUDITOR] };
    await expect(svc.list(auditor)).resolves.toEqual([]);
    await expect(
      svc.place(auditor, { scopeType: LegalHoldScope.USER, scopeId: uuidv7(), reason: 'no' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
