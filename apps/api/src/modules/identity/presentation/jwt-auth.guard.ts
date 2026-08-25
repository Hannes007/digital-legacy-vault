import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';


import { CLOCK } from '../../../common/tokens';
import { AccessTokenService } from '../application/access-token.service';
import { SESSION_REPOSITORY, type SessionRepository } from '../application/ports';

import type { AuthenticatedRequest } from './authenticated-request';
import type { Clock } from '../../../common/time/clock';
import type { Request } from 'express';

/**
 * Bearer-token guard. Verifies the RS256 access token offline, then confirms
 * the referenced session is still live (not revoked/expired and owned by the
 * token subject) so logout and session revocation take effect immediately even
 * though access tokens are short-lived and stateless. Attaches `authUser`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly accessTokens: AccessTokenService,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const claims = (() => {
      try {
        return this.accessTokens.verify(header.slice('Bearer '.length));
      } catch {
        throw new UnauthorizedException('Invalid or expired access token.');
      }
    })();

    const session = await this.sessions.findById(claims.sid);
    const now = this.clock.now();
    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= now.getTime() ||
      session.userId !== claims.sub
    ) {
      throw new UnauthorizedException('Session is no longer valid.');
    }

    (req as AuthenticatedRequest).authUser = {
      userId: claims.sub,
      sessionId: claims.sid,
      roles: claims.roles,
    };
    return true;
  }
}
