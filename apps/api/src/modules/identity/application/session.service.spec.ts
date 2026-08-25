import { SessionNotFoundError } from '../domain/errors/identity.errors';

import { SessionService } from './session.service';

import type { RefreshTokenRepository, SessionRepository } from './ports';
import type { AuditService } from '../../audit/audit.service';

const NOW = new Date('2026-07-06T12:00:00.000Z');

function build() {
  const sessions = {
    listActiveByUser: jest.fn(),
    revokeOwned: jest.fn(),
  } as unknown as jest.Mocked<SessionRepository>;
  const refreshTokens = { revokeBySession: jest.fn() } as unknown as jest.Mocked<RefreshTokenRepository>;
  const audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
  const clock = { now: () => NOW };
  return { service: new SessionService(sessions, refreshTokens, clock, audit), sessions, refreshTokens };
}

describe('SessionService', () => {
  it('maps sessions and flags the current one', async () => {
    const { service, sessions } = build();
    sessions.listActiveByUser.mockResolvedValue([
      { id: 'sess-1', deviceLabel: 'Chrome on Windows', ipMasked: '1.2.x.x', lastSeenAt: NOW, createdAt: NOW },
      { id: 'sess-2', deviceLabel: 'Safari on iOS', ipMasked: '3.4.x.x', lastSeenAt: NOW, createdAt: NOW },
    ]);

    const list = await service.list('user-1', 'sess-2');

    expect(list).toHaveLength(2);
    expect(list[0]?.current).toBe(false);
    expect(list[1]?.current).toBe(true);
    expect(list[0]?.lastSeenAt).toBe(NOW.toISOString());
  });

  it('revokes an owned session and its refresh tokens', async () => {
    const { service, sessions, refreshTokens } = build();
    sessions.revokeOwned.mockResolvedValue(true);
    await service.revoke('user-1', 'sess-1', '1.2.x.x');
    expect(refreshTokens.revokeBySession).toHaveBeenCalledWith('sess-1');
  });

  it('404s when revoking a session the user does not own', async () => {
    const { service, sessions } = build();
    sessions.revokeOwned.mockResolvedValue(false);
    await expect(service.revoke('user-1', 'nope', '1.2.x.x')).rejects.toBeInstanceOf(
      SessionNotFoundError,
    );
  });
});
