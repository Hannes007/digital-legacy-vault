import type { Env } from '@dlv/config';
import type { CookieOptions } from 'express';

/** Name of the refresh-token cookie (phase-2-contracts). */
export const REFRESH_COOKIE_NAME = 'dlv_rt';
/** Scoped so the browser only sends the refresh token to auth endpoints. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** Base cookie attributes shared by set and clear operations. */
function baseOptions(env: Env): CookieOptions {
  return {
    httpOnly: true,
    // Secure everywhere except plain-HTTP local dev.
    secure: env.NODE_ENV === 'production' || env.NODE_ENV === 'staging',
    sameSite: 'strict',
    domain: env.COOKIE_DOMAIN,
    path: REFRESH_COOKIE_PATH,
  };
}

/** Options for setting/rotating the refresh cookie with an explicit lifetime. */
export function refreshCookieOptions(env: Env, maxAgeSeconds: number): CookieOptions {
  return { ...baseOptions(env), maxAge: maxAgeSeconds * 1000 };
}

/** Options for clearing the refresh cookie (must match path/domain to clear). */
export function clearRefreshCookieOptions(env: Env): CookieOptions {
  return baseOptions(env);
}
