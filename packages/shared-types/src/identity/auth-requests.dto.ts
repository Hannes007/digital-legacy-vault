import type { AuthenticationResponseJson, RegistrationResponseJson } from './webauthn.js';

/**
 * Body of `POST /api/v1/auth/register`.
 *
 * Password policy is enforced server-side; the API responds 201 with a
 * `UserDto` and sends a verification email.
 */
export interface RegisterRequest {
  /** Email address; becomes the unique login identifier after verification. */
  email: string;
  /** Plaintext password; hashed with Argon2id server-side, never stored raw. */
  password: string;
  /** Given name. */
  firstName: string;
  /** Family name. */
  lastName: string;
}

/**
 * Body of `POST /api/v1/auth/login`.
 *
 * Responses are identical in shape and timing for unknown emails and wrong
 * passwords (no user enumeration, phase-2-contracts cross-cutting rules).
 */
export interface LoginRequest {
  /** Email address. */
  email: string;
  /** Plaintext password. */
  password: string;
}

/**
 * Body of `POST /api/v1/auth/mfa/totp/verify` — completes a login that
 * returned `MFA_REQUIRED`.
 */
export interface TotpVerifyRequest {
  /** The short-lived opaque token returned by the login step. */
  mfaToken: string;
  /** Six-digit TOTP code from the authenticator app. */
  code: string;
}

/**
 * Body of `POST /api/v1/auth/passkeys/registration/options` (bearer-authenticated).
 * The server responds with {@link import('./webauthn.js').PublicKeyCredentialCreationOptionsJson}.
 */
export interface PasskeyRegistrationStart {
  /** Optional user-supplied label for the new passkey (e.g. `Work laptop`). */
  deviceLabel?: string;
}

/**
 * Body of `POST /api/v1/auth/passkeys/registration/verify` — stores the new
 * credential (201 on success).
 */
export interface PasskeyRegistrationFinish {
  /** The client-produced registration credential (WebAuthn JSON form). */
  credential: RegistrationResponseJson;
  /** Optional user-supplied label for the new passkey. */
  deviceLabel?: string;
}

/**
 * Body of `POST /api/v1/auth/passkeys/authentication/options`.
 *
 * Public endpoint: pass `email` for a first-factor passkey login, or
 * `mfaToken` for an MFA step-up after password login. Omitting both requests
 * options for a discoverable-credential (usernameless) flow.
 */
export interface PasskeyAuthStart {
  /** Email address for a first-factor passkey login. */
  email?: string;
  /** Short-lived opaque token when using a passkey as the second factor. */
  mfaToken?: string;
}

/**
 * Body of `POST /api/v1/auth/passkeys/authentication/verify` — the server
 * responds with a `LoginResultDto`.
 */
export interface PasskeyAuthFinish {
  /** The client-produced authentication assertion (WebAuthn JSON form). */
  credential: AuthenticationResponseJson;
  /** Short-lived opaque token when completing an MFA step-up. */
  mfaToken?: string;
}
