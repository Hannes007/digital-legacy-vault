import { Role } from '@dlv/shared-types';

import {
  InvalidRefreshTokenError,
  RefreshTokenReusedError,
} from '../domain/errors/identity.errors';

import { RefreshService } from './refresh.service';

import type {
  RefreshTokenRecord,
  RefreshTokenRepository,
  SessionRecord,
  SessionRepository,
  UserRecord,
  UserRepository,
} from './ports';
import type { SessionTokenFactory } from './session-token.factory';
import type { AuditService } from '../../audit/audit.service';

const NOW = new Date('2026-07-06T12:00:00.000Z');
const FUTURE = new Date('2026-08-06T12:00:00.000Z');

function build() {
  const refreshTokens: jest.Mocked<RefreshTokenRepository> = {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    markRotated: jest.fn(),
    revokeFamily: jest.fn(),
    revokeBySession: jest.fn(),
  };
  const sessions: jest.Mocked<SessionRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    touch: jest.fn(),
    revoke: jest.fn(),
    listActiveByUser: jest.fn(),
    revokeOwned: jest.fn(),
  };
  const users = { findById: jest.fn() } as unknown as jest.Mocked<UserRepository>;
  const clock = { now: () => NOW };
  const tokenFactory = {
    issue: jest.fn().mockResolvedValue({
      access: { accessToken: 'access.jwt', expiresIn: 900 },
      refreshToken: 'raw-successor',
      refreshTokenId: 'rt-new',
    }),
  } as unknown as jest.Mocked<SessionTokenFactory>;
  const audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

  const service = new RefreshService(
    refreshTokens,
    sessions,
    users,
    clock,
    tokenFactory,
    audit,
  );
  return { service, refreshTokens, sessions, users, tokenFactory, audit };
}

const activeRecord: RefreshTokenRecord = {
  id: 'rt-old',
  sessionId: 'sess-1',
  userId: 'user-1',
  familyId: 'fam-1',
  status: 'ACTIVE',
  expiresAt: FUTURE,
};

const liveSession: SessionRecord = {
  id: 'sess-1',
  userId: 'user-1',
  revokedAt: null,
  expiresAt: FUTURE,
};

const user = { id: 'user-1', roles: [Role.REGISTERED_USER] } as UserRecord;

describe('RefreshService', () => {
  it('rejects a missing/unknown token without touching state', async () => {
    const { service, refreshTokens } = build();
    refreshTokens.findByTokenHash.mockResolvedValue(null);
    await expect(service.refresh('nope', ctx())).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(refreshTokens.markRotated).not.toHaveBeenCalled();
  });

  it('rotates a valid token, preserving the family and absolute expiry', async () => {
    const { service, refreshTokens, sessions, users, tokenFactory } = build();
    refreshTokens.findByTokenHash.mockResolvedValue({ ...activeRecord });
    sessions.findById.mockResolvedValue({ ...liveSession });
    users.findById.mockResolvedValue(user);

    const outcome = await service.refresh('raw-old', ctx());

    expect(tokenFactory.issue).toHaveBeenCalledWith(
      expect.objectContaining({ familyId: 'fam-1', sessionId: 'sess-1', expiresAt: FUTURE }),
    );
    expect(refreshTokens.markRotated).toHaveBeenCalledWith('rt-old', 'rt-new');
    expect(sessions.touch).toHaveBeenCalledWith('sess-1', NOW);
    expect(outcome.tokens.accessToken).toBe('access.jwt');
    expect(outcome.refresh.token).toBe('raw-successor');
    expect(outcome.refresh.maxAgeSeconds).toBeGreaterThan(0);
  });

  it('detects reuse of a rotated token and revokes the whole family + session', async () => {
    const { service, refreshTokens, sessions, audit } = build();
    refreshTokens.findByTokenHash.mockResolvedValue({ ...activeRecord, status: 'ROTATED' });

    await expect(service.refresh('raw-old', ctx())).rejects.toBeInstanceOf(RefreshTokenReusedError);
    expect(refreshTokens.revokeFamily).toHaveBeenCalledWith('fam-1');
    expect(sessions.revoke).toHaveBeenCalledWith('sess-1', NOW);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'auth.refresh.reuse_detected' }),
    );
  });

  it('rejects when the backing session was revoked', async () => {
    const { service, refreshTokens, sessions } = build();
    refreshTokens.findByTokenHash.mockResolvedValue({ ...activeRecord });
    sessions.findById.mockResolvedValue({ ...liveSession, revokedAt: NOW });
    await expect(service.refresh('raw-old', ctx())).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });
});

function ctx() {
  return { ip: '1.2.3.4', ipMasked: '1.2.x.x', userAgent: 'jest', deviceLabel: 'Test' };
}
