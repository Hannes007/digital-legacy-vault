import type { AuthTokensDto, LoginResultDto } from '@dlv/shared-types';

/**
 * Instruction for the presentation layer to set/refresh the `dlv_rt` cookie.
 * The raw refresh token never appears in a response body — only in this cookie.
 */
export interface RefreshCookieInstruction {
  token: string;
  maxAgeSeconds: number;
}

/** Result of a login/MFA step: the DTO plus an optional cookie instruction. */
export interface AuthOutcome {
  result: LoginResultDto;
  refresh?: RefreshCookieInstruction;
}

/** Result of a token refresh: new access tokens plus the rotated cookie. */
export interface RefreshOutcome {
  tokens: AuthTokensDto;
  refresh: RefreshCookieInstruction;
}
