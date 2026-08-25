import { Inject, Injectable } from '@nestjs/common';

import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';

import {
  REFRESH_TOKEN_REPOSITORY,
  SESSION_REPOSITORY,
  type RefreshTokenRepository,
  type SessionRepository,
} from './ports';

import type { Clock } from '../../../common/time/clock';

/**
 * Logout use case: revoke the current session and every refresh token bound to
 * it. Idempotent — revoking an already-revoked session is a no-op.
 */
@Injectable()
export class LogoutService {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async logout(sessionId: string, actorUserId: string, ipMasked: string): Promise<void> {
    await this.sessions.revoke(sessionId, this.clock.now());
    await this.refreshTokens.revokeBySession(sessionId);
    await this.audit.record({
      actorUserId,
      eventType: 'auth.logout',
      resource: `session:${sessionId}`,
      ipMasked,
      payload: {},
    });
  }
}
