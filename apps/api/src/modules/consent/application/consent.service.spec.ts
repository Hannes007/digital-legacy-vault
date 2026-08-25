import { ConsentPurpose, ConsentStatus } from '@dlv/shared-types';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { ConsentService } from './consent.service';

import type { ConsentRecord, ConsentRepository } from './ports';
import type { Clock } from '../../../common/time/clock';
import type { AuditService } from '../../audit/audit.service';

const audit = { record: async () => undefined } as unknown as AuditService;
const clock: Clock = { now: () => new Date('2026-07-16T10:00:00Z') };

function fakeRepo() {
  const store = new Map<string, ConsentRecord>();
  const repo: ConsentRepository = {
    create: async (input) => {
      const rec: ConsentRecord = { ...input, status: ConsentStatus.GRANTED, withdrawnAt: null, createdAt: new Date() };
      store.set(rec.id, rec);
      return rec;
    },
    findById: async (id) => store.get(id) ?? null,
    listByUser: async (userId) => [...store.values()].filter((c) => c.userId === userId),
    withdraw: async (id, withdrawnAt) => {
      const rec = store.get(id);
      if (rec) store.set(id, { ...rec, status: ConsentStatus.WITHDRAWN, withdrawnAt });
    },
  };
  return { repo, store };
}

describe('ConsentService', () => {
  it('records a first-class consent grant', async () => {
    const { repo } = fakeRepo();
    const svc = new ConsentService(repo, clock, audit);
    const dto = await svc.grant(
      'user-1',
      { purpose: ConsentPurpose.ELECTRONIC_SIGNATURE, statementText: 'I agree.' },
      { ipMasked: '102.65.x.x', userAgent: 'Chrome' },
    );
    expect(dto.status).toBe(ConsentStatus.GRANTED);
    expect(dto.purpose).toBe(ConsentPurpose.ELECTRONIC_SIGNATURE);
  });

  it('rejects an empty consent statement', async () => {
    const { repo } = fakeRepo();
    const svc = new ConsentService(repo, clock, audit);
    await expect(
      svc.record({ userId: 'user-1', purpose: ConsentPurpose.MARKETING, statementText: '  ', grantedAt: clock.now() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('withdraws own consent and blocks double-withdraw', async () => {
    const { repo } = fakeRepo();
    const svc = new ConsentService(repo, clock, audit);
    const dto = await svc.grant('user-1', { purpose: ConsentPurpose.MARKETING, statementText: 'ok' }, { ipMasked: null, userAgent: null });
    const withdrawn = await svc.withdraw('user-1', dto.id);
    expect(withdrawn.status).toBe(ConsentStatus.WITHDRAWN);
    await expect(svc.withdraw('user-1', dto.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses to withdraw another user's consent", async () => {
    const { repo } = fakeRepo();
    const svc = new ConsentService(repo, clock, audit);
    const dto = await svc.grant('user-1', { purpose: ConsentPurpose.MARKETING, statementText: 'ok' }, { ipMasked: null, userAgent: null });
    await expect(svc.withdraw('someone-else', dto.id)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
