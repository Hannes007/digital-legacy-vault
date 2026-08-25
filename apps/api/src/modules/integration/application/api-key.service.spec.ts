import { ApiKeyStatus } from '@dlv/shared-types';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { ApiKeyService } from './api-key.service';

import type { ApiKeyRecord, ApiKeyRepository, CreateApiKeyInput } from './ports';
import type { Clock } from '../../../common/time/clock';
import type { AuditService } from '../../audit/audit.service';

const NOW = new Date('2026-07-19T12:00:00Z');
const clock: Clock = { now: () => NOW };
const audit = { record: async () => undefined } as unknown as AuditService;

function repo(store: ApiKeyRecord[]): ApiKeyRepository {
  return {
    create: async (input: CreateApiKeyInput) => {
      const record: ApiKeyRecord = {
        ...input,
        status: ApiKeyStatus.ACTIVE,
        lastUsedAt: null,
        createdAt: NOW,
      };
      store.push(record);
      return record;
    },
    findByHash: async (hash) => store.find((k) => k.keyHash === hash) ?? null,
    findById: async (id) => store.find((k) => k.id === id) ?? null,
    listByOwner: async (owner) => store.filter((k) => k.ownerUserId === owner),
    revoke: async (id) => {
      const k = store.find((x) => x.id === id);
      if (k) k.status = ApiKeyStatus.REVOKED;
    },
    touchLastUsed: async () => undefined,
  };
}

describe('ApiKeyService (Phase 8)', () => {
  it('issues a key shown once and authenticates it to a scoped principal', async () => {
    const store: ApiKeyRecord[] = [];
    const svc = new ApiKeyService(repo(store), clock, audit);
    const created = await svc.create('u1', { name: 'CI key', scopes: ['documents:read'] });
    expect(created.apiKey.startsWith('dlv_sk_')).toBe(true);

    const principal = await svc.authenticate(created.apiKey);
    expect(principal).toMatchObject({ ownerUserId: 'u1', scopes: ['documents:read'] });
    // Stored representation never contains the secret.
    expect(JSON.stringify(store)).not.toContain(created.apiKey);
  });

  it('rejects unknown, revoked and expired keys', async () => {
    const store: ApiKeyRecord[] = [];
    const svc = new ApiKeyService(repo(store), clock, audit);
    await expect(svc.authenticate('dlv_sk_' + 'a'.repeat(43))).rejects.toBeInstanceOf(UnauthorizedException);

    const created = await svc.create('u1', { name: 'k', scopes: ['usage:read'] });
    await svc.revoke('u1', store[0]?.id ?? '');
    await expect(svc.authenticate(created.apiKey)).rejects.toBeInstanceOf(UnauthorizedException);

    const expiring = await svc.create('u1', {
      name: 'k2',
      scopes: ['usage:read'],
      expiresAt: '2026-08-01T00:00:00Z',
    });
    const rec = store.find((k) => k.name === 'k2');
    if (rec) rec.expiresAt = new Date('2026-07-01T00:00:00Z');
    await expect(svc.authenticate(expiring.apiKey)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validates scopes and expiry at creation', async () => {
    const svc = new ApiKeyService(repo([]), clock, audit);
    await expect(svc.create('u1', { name: 'x', scopes: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.create('u1', { name: 'x', scopes: ['nope' as never] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.create('u1', { name: 'x', scopes: ['usage:read'], expiresAt: '2020-01-01T00:00:00Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
