import { Inject, Injectable } from '@nestjs/common';


import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import { SessionNotFoundError } from '../domain/errors/identity.errors';

import {
  REFRESH_TOKEN_REPOSITORY,
  SESSION_REPOSITORY,
  type RefreshTokenRepository,
  type SessionRepository,
} from './ports';

import type { Clock } from '../../../common/time/clock';
import type { SessionDto } from '@dlv/shared-types';

/**
 * Session management for `GET/DELETE /users/me/sessions`. Revoking a session
 * also revokes its refresh-token family so the device is fully logged out.
 */
@Injectable()
export class SessionService {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async list(userId: string, currentSessionId: string): Promise<SessionDto[]> {
    const rows = await this.sessions.listActiveByUser(userId, this.clock.now());
    return rows.map((r) => ({
      id: r.id,
      deviceLabel: r.deviceLabel,
      ipMasked: r.ipMasked,
      lastSeenAt: r.lastSeenAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      current: r.id === currentSessionId,
    }));
  }

  async revoke(userId: string, sessionId: string, ipMasked: string): Promise<void> {
    const revoked = await this.sessions.revokeOwned(sessionId, userId, this.clock.now());
    if (!revoked) {
      throw new SessionNotFoundError();
    }
    await this.refreshTokens.revokeBySession(sessionId);
    await this.audit.record({
      actorUserId: userId,
      eventType: 'auth.session.revoked',
      resource: `session:${sessionId}`,
      ipMasked,
      payload: {},
    });
  }
}
