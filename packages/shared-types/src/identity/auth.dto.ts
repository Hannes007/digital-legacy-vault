import type { UserDto } from './user.dto.js';

/**
 * Access-token material returned on successful authentication or refresh.
 *
 * The refresh token is intentionally absent: it travels ONLY as the httpOnly
 * cookie `dlv_rt` (Path=/api/v1/auth, Secure, SameSite=Strict) and must never
 * appear in a response body.
 */
export interface AuthTokensDto {
  /** RS256-signed JWT access token (15 min TTL, PROJECT_MEMORY §3). */
  accessToken: string;
  /** Access-token lifetime in seconds from time of issue. */
  accessTokenExpiresIn: number;
}

/**
 * Result of `POST /api/v1/auth/login`, TOTP verification, or passkey
 * authentication.
 *
 * - `AUTHENTICATED`: `user` and `tokens` are present; the `dlv_rt` cookie is set.
 * - `MFA_REQUIRED`: `mfaToken` (short-lived, 5 min, opaque) and `methods` are
 *   present; the client must complete a second factor before tokens are issued.
 */
export interface LoginResultDto {
  /** Outcome of the credential check. */
  status: 'AUTHENTICATED' | 'MFA_REQUIRED';
  /** Short-lived (5 min) opaque token to complete MFA; present when `MFA_REQUIRED`. */
  mfaToken?: string;
  /** Second-factor methods available to this account; present when `MFA_REQUIRED`. */
  methods?: Array<'TOTP' | 'PASSKEY'>;
  /** Authenticated user; present when `AUTHENTICATED`. */
  user?: UserDto;
  /** Issued access-token material; present when `AUTHENTICATED`. */
  tokens?: AuthTokensDto;
}
