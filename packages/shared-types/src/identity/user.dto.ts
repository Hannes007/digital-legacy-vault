import type { Role } from '../common/role.js';

/**
 * Public representation of a user account as returned by the API
 * (e.g. `POST /api/v1/auth/register`, `GET /api/v1/auth/me`).
 *
 * Never contains credentials, TOTP secrets or internal security state.
 */
export interface UserDto {
  /** UUIDv7 user identifier. */
  id: string;
  /** Primary email address (unique, used for login). */
  email: string;
  /** Given name. */
  firstName: string;
  /** Family name. */
  lastName: string;
  /** Effective platform roles (vault-scoped roles are resolved per-vault via ABAC). */
  roles: Role[];
  /** True once the verification-email flow has completed. */
  emailVerified: boolean;
  /** True when at least one second factor (TOTP or passkey) is enabled. */
  mfaEnabled: boolean;
  /** Number of registered WebAuthn passkeys. */
  passkeyCount: number;
  /** Account creation time, ISO 8601 UTC (e.g. `2026-07-05T12:00:00.000Z`). */
  createdAt: string;
}
