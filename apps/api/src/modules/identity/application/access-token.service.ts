import { Inject, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { uuidv7 } from 'uuidv7';

import { ENV } from '../../../common/tokens';

import type { Env } from '@dlv/config';
import type { Role } from '@dlv/shared-types';


/** Verified access-token claims attached to authenticated requests. */
export interface AccessTokenClaims {
  /** User id. */
  sub: string;
  /** Platform roles. */
  roles: Role[];
  /** Session id (matches the `sessions.id` row). */
  sid: string;
  /** JWT id. */
  jti: string;
}

/** Result of issuing an access token. */
export interface IssuedAccessToken {
  accessToken: string;
  /** Lifetime in seconds from issue (for `AuthTokensDto.accessTokenExpiresIn`). */
  expiresIn: number;
}

/**
 * Issues and verifies RS256 JWT access tokens (PROJECT_MEMORY §3: 15 min TTL,
 * RS256, iss/aud). Signing key material comes from {@link Env} (Secrets Manager
 * in cloud, `.env` locally). Verification is fully offline — no DB hit — so the
 * guard can also confirm the session is still live separately.
 */
@Injectable()
export class AccessTokenService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  issue(userId: string, roles: Role[], sessionId: string): IssuedAccessToken {
    const expiresIn = this.env.ACCESS_TOKEN_TTL_SECONDS;
    const accessToken = jwt.sign(
      { roles, sid: sessionId },
      this.env.JWT_PRIVATE_KEY_PEM,
      {
        algorithm: 'RS256',
        subject: userId,
        issuer: this.env.JWT_ISSUER,
        audience: this.env.JWT_AUDIENCE,
        expiresIn,
        jwtid: uuidv7(),
      },
    );
    return { accessToken, expiresIn };
  }

  /**
   * Verifies signature, expiry, issuer and audience. Throws (caller maps to
   * 401). Returns the strongly-typed claims on success.
   */
  verify(token: string): AccessTokenClaims {
    const decoded = jwt.verify(token, this.env.JWT_PUBLIC_KEY_PEM, {
      algorithms: ['RS256'],
      issuer: this.env.JWT_ISSUER,
      audience: this.env.JWT_AUDIENCE,
    });
    if (typeof decoded === 'string') {
      throw new Error('Unexpected string JWT payload');
    }
    return {
      sub: String(decoded.sub),
      roles: (decoded.roles as Role[] | undefined) ?? [],
      sid: String((decoded).sid),
      jti: String(decoded.jti),
    };
  }
}
