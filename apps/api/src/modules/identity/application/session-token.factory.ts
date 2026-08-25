import { generateOpaqueToken, sha256Hex } from '@dlv/crypto';
import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';


import { AccessTokenService, type IssuedAccessToken } from './access-token.service';
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from './ports';

import type { Role } from '@dlv/shared-types';

/** Parameters for issuing a token pair against an existing session. */
export interface IssueTokensParams {
  userId: string;
  roles: Role[];
  sessionId: string;
  /** Rotation family (new on login, preserved on refresh). */
  familyId: string;
  /** Absolute refresh-token expiry (preserved across rotations). */
  expiresAt: Date;
}

/** The freshly issued access token, raw refresh token and its stored id. */
export interface IssuedTokens {
  access: IssuedAccessToken;
  /** Raw opaque refresh token — travels only via the httpOnly cookie. */
  refreshToken: string;
  /** Persisted refresh-token id (used to link rotation chains). */
  refreshTokenId: string;
}

/**
 * Mints an access token + persisted refresh token for a session. Shared by
 * login (fresh family) and refresh (rotated family) so both paths hash and
 * store tokens identically — only the SHA-256 of the token is ever stored.
 */
@Injectable()
export class SessionTokenFactory {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    private readonly accessTokens: AccessTokenService,
  ) {}

  async issue(params: IssueTokensParams): Promise<IssuedTokens> {
    const refreshTokenId = uuidv7();
    const rawToken = generateOpaqueToken();
    await this.refreshTokens.create({
      id: refreshTokenId,
      sessionId: params.sessionId,
      userId: params.userId,
      familyId: params.familyId,
      tokenHash: sha256Hex(rawToken),
      expiresAt: params.expiresAt,
    });
    const access = this.accessTokens.issue(params.userId, params.roles, params.sessionId);
    return { access, refreshToken: rawToken, refreshTokenId };
  }
}
