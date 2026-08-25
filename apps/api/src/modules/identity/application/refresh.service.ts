import { sha256Hex } from '@dlv/crypto';
import { Inject, Injectable } from '@nestjs/common';

import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import {
  InvalidRefreshTokenError,
  RefreshTokenReusedError,
  UserNotFoundError,
} from '../domain/errors/identity.errors';

import {
  REFRESH_TOKEN_REPOSITORY,
  SESSION_REPOSITORY,
  USER_REPOSITORY,
  type RefreshTokenRepository,
  type SessionRepository,
  type UserRepository,
} from './ports';
import { SessionTokenFactory } from './session-token.factory';

import type { RefreshOutcome } from './auth-outcomes';
import type { RequestContext } from '../../../common/http/request-context';
import type { Clock } from '../../../common/time/clock';

/**
 * Refresh-token rotation with reuse detection (security-architecture §2.3).
 *
 * A valid ACTIVE token is rotated: the successor keeps the family and its
 * absolute expiry, the presented token is marked ROTATED. Presenting a
 * ROTATED/REVOKED token means the token leaked and was replayed — the entire
 * family and its session are revoked before failing.
 */
@Injectable()
export class RefreshService {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokenFactory: SessionTokenFactory,
    private readonly audit: AuditService,
  ) {}

  async refresh(rawToken: string | undefined, ctx: RequestContext): Promise<RefreshOutcome> {
    if (!rawToken) {
      throw new InvalidRefreshTokenError();
    }

    const record = await this.refreshTokens.findByTokenHash(sha256Hex(rawToken));
    if (!record) {
      throw new InvalidRefreshTokenError();
    }

    if (record.status !== 'ACTIVE') {
      // Reuse detected — revoke the whole family and its session.
      await this.refreshTokens.revokeFamily(record.familyId);
      await this.sessions.revoke(record.sessionId, this.clock.now());
      await this.audit.record({
        actorUserId: record.userId,
        eventType: 'auth.refresh.reuse_detected',
        resource: `session:${record.sessionId}`,
        ipMasked: ctx.ipMasked,
        payload: { familyId: record.familyId },
      });
      throw new RefreshTokenReusedError();
    }

    const now = this.clock.now();
    if (record.expiresAt.getTime() <= now.getTime()) {
      throw new InvalidRefreshTokenError();
    }

    const session = await this.sessions.findById(record.sessionId);
    if (!session || session.revokedAt !== null || session.expiresAt.getTime() <= now.getTime()) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(record.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const issued = await this.tokenFactory.issue({
      userId: user.id,
      roles: user.roles,
      sessionId: session.id,
      familyId: record.familyId,
      expiresAt: record.expiresAt, // preserve absolute family expiry
    });
    await this.refreshTokens.markRotated(record.id, issued.refreshTokenId);
    await this.sessions.touch(session.id, now);

    await this.audit.record({
      actorUserId: user.id,
      eventType: 'auth.token.refreshed',
      resource: `session:${session.id}`,
      ipMasked: ctx.ipMasked,
      payload: {},
    });

    const remainingSeconds = Math.max(
      1,
      Math.floor((record.expiresAt.getTime() - now.getTime()) / 1000),
    );
    return {
      tokens: {
        accessToken: issued.access.accessToken,
        accessTokenExpiresIn: issued.access.expiresIn,
      },
      refresh: { token: issued.refreshToken, maxAgeSeconds: remainingSeconds },
    };
  }
}
