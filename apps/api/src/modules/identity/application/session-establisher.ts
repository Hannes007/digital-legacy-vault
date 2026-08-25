import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';


import { CLOCK, ENV } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';

import { toUserDto } from './identity.mapper';
import { SESSION_REPOSITORY, type SessionRepository, type UserRecord } from './ports';
import { SessionTokenFactory } from './session-token.factory';

import type { AuthOutcome } from './auth-outcomes';
import type { RequestContext } from '../../../common/http/request-context';
import type { Clock } from '../../../common/time/clock';
import type { Env } from '@dlv/config';

/**
 * Creates a session and issues the first access + refresh token pair for a
 * freshly authenticated user. Shared by every path that fully authenticates a
 * principal — password login, TOTP MFA completion and passkey authentication —
 * so session creation, `amr` recording, cookie lifetime and the login audit
 * event stay identical regardless of the factor(s) used.
 */
@Injectable()
export class SessionEstablisher {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokenFactory: SessionTokenFactory,
    private readonly audit: AuditService,
  ) {}

  /**
   * @param amr - Authentication methods reference, e.g. `['pwd']`,
   *   `['pwd','totp']` or `['passkey']`.
   */
  async establish(user: UserRecord, amr: string[], ctx: RequestContext): Promise<AuthOutcome> {
    const now = this.clock.now();
    const sessionId = uuidv7();
    const familyId = uuidv7();
    const expiresAt = new Date(now.getTime() + this.env.REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.sessions.create({
      id: sessionId,
      userId: user.id,
      ip: ctx.ip,
      ipMasked: ctx.ipMasked,
      userAgent: ctx.userAgent,
      deviceLabel: ctx.deviceLabel,
      amr,
      lastSeenAt: now,
      expiresAt,
    });

    const issued = await this.tokenFactory.issue({
      userId: user.id,
      roles: user.roles,
      sessionId,
      familyId,
      expiresAt,
    });

    await this.audit.record({
      actorUserId: user.id,
      eventType: 'auth.login.succeeded',
      resource: `session:${sessionId}`,
      ipMasked: ctx.ipMasked,
      payload: { deviceLabel: ctx.deviceLabel, amr },
    });

    return {
      result: {
        status: 'AUTHENTICATED',
        user: toUserDto(user),
        tokens: {
          accessToken: issued.access.accessToken,
          accessTokenExpiresIn: issued.access.expiresIn,
        },
      },
      refresh: { token: issued.refreshToken, maxAgeSeconds: this.env.REFRESH_TOKEN_TTL_SECONDS },
    };
  }
}
