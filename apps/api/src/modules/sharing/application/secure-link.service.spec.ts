import { sha256Hex } from '@dlv/crypto';
import { SharePermission, ShareStatus } from '@dlv/shared-types';

import { SecureLinkService } from './secure-link.service';
import type { SecureLinkRecord, SecureLinkRepository } from './ports';
import type { DocumentRepository } from '../../vault/application/ports';

import type { AuditService } from '../../audit/audit.service';
import type { Clock } from '../../../common/time/clock';
import type { Env } from '@dlv/config';

const NOW = new Date('2026-07-07T00:00:00Z');

function makeService(link?: Partial<SecureLinkRecord>) {
  const store = new Map<string, SecureLinkRecord>();
  let created: SecureLinkRecord | undefined;
  const links: SecureLinkRepository = {
    create: async (input) => {
      created = {
        id: input.id, documentId: input.documentId, ownerId: input.ownerId, permission: input.permission,
        status: ShareStatus.ACTIVE, maxViews: input.maxViews, viewCount: 0, expiresAt: input.expiresAt, createdAt: NOW,
      };
      store.set(input.tokenHash, created);
      return created;
    },
    findByTokenHash: async (h) => store.get(h) ?? null,
    listByOwner: async () => (created ? [created] : []),
    incrementViews: async (id) => { const l = [...store.values()].find((x) => x.id === id); if (l) l.viewCount += 1; },
    revoke: async () => undefined,
  };
  if (link) {
    const seeded: SecureLinkRecord = {
      id: 'l1', documentId: 'doc-1', ownerId: 'owner-1', permission: SharePermission.VIEW,
      status: ShareStatus.ACTIVE, maxViews: null, viewCount: 0, expiresAt: new Date('2026-08-01T00:00:00Z'), createdAt: NOW, ...link,
    };
    store.set(sha256Hex('seed-token'), seeded);
  }
  const documents = { findById: async () => ({ ownerId: 'owner-1' }) } as unknown as DocumentRepository;
  const clock: Clock = { now: () => NOW };
  const env = { WEB_BASE_URL: 'https://dlv.example' } as Env;
  const audit = { record: async () => undefined } as unknown as AuditService;
  return { service: new SecureLinkService(links, documents, clock, env, audit), store };
}

describe('SecureLinkService', () => {
  it('creates a link and returns a one-time URL', async () => {
    const { service } = makeService();
    const dto = await service.create('owner-1', { documentId: 'doc-1', expiresInDays: 7 });
    expect(dto.url).toMatch(/^https:\/\/dlv\.example\/s\//);
  });
  it('rejects an expiry beyond 90 days', async () => {
    const { service } = makeService();
    await expect(service.create('owner-1', { documentId: 'doc-1', expiresInDays: 120 })).rejects.toThrow();
  });
  it('resolves a valid token and counts the view', async () => {
    const { service } = makeService({});
    expect((await service.resolve('seed-token')).documentId).toBe('doc-1');
  });
  it('rejects an expired link', async () => {
    const { service } = makeService({ expiresAt: new Date('2026-07-01T00:00:00Z') });
    await expect(service.resolve('seed-token')).rejects.toThrow();
  });
  it('rejects a revoked link', async () => {
    const { service } = makeService({ status: ShareStatus.REVOKED });
    await expect(service.resolve('seed-token')).rejects.toThrow();
  });
  it('rejects once the view limit is reached', async () => {
    const { service } = makeService({ maxViews: 1, viewCount: 1 });
    await expect(service.resolve('seed-token')).rejects.toThrow();
  });
});
