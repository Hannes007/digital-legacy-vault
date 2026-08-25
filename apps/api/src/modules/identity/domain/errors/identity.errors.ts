/**
 * Identity domain errors — framework-free (no Nest, no I/O).
 *
 * Each error carries a stable machine-readable `code` and a protocol-level
 * `httpStatus` hint that the global RFC 9457 problem+json filter maps onto the
 * response. Messages are client-safe: no PII, no secrets, no internals.
 */
export abstract class IdentityError extends Error {
  /** Stable machine-readable error code (SCREAMING_SNAKE). */
  abstract readonly code: string;
  /** HTTP status the presentation layer maps this error to. */
  abstract readonly httpStatus: number;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Raised by the {@link Email} value object on malformed input. */
export class InvalidEmailError extends IdentityError {
  readonly code = 'AUTH_INVALID_EMAIL';
  readonly httpStatus = 400;
  constructor() {
    super('The supplied email address is not valid.');
  }
}

/** Registration attempted with an email that already has an account. */
export class EmailAlreadyRegisteredError extends IdentityError {
  readonly code = 'AUTH_EMAIL_IN_USE';
  readonly httpStatus = 409;
  constructor() {
    super('An account with this email address already exists.');
  }
}

/**
 * Login failed. Deliberately identical for unknown email, wrong password,
 * non-authenticatable account state and active lockout — no user enumeration
 * (phase-2-contracts cross-cutting rules; security-architecture §7.2).
 */
export class InvalidCredentialsError extends IdentityError {
  readonly code = 'AUTH_INVALID_CREDENTIALS';
  readonly httpStatus = 401;
  constructor() {
    super('Invalid email or password.');
  }
}

/** Hourly per-account login attempt budget exhausted (10/h/account). */
export class TooManyLoginAttemptsError extends IdentityError {
  readonly code = 'AUTH_TOO_MANY_ATTEMPTS';
  readonly httpStatus = 429;
  constructor() {
    super('Too many login attempts. Please try again later.');
  }
}

/** Email-verification token unknown, already used or expired. */
export class InvalidVerificationTokenError extends IdentityError {
  readonly code = 'AUTH_INVALID_VERIFICATION_TOKEN';
  readonly httpStatus = 400;
  constructor() {
    super('The verification token is invalid or has expired.');
  }
}

/** The short-lived MFA continuation token is unknown, used or expired. */
export class InvalidMfaTokenError extends IdentityError {
  readonly code = 'AUTH_INVALID_MFA_TOKEN';
  readonly httpStatus = 401;
  constructor() {
    super('The MFA token is invalid or has expired.');
  }
}

/** Wrong TOTP code presented while completing an MFA login. */
export class InvalidMfaCodeError extends IdentityError {
  readonly code = 'AUTH_INVALID_MFA_CODE';
  readonly httpStatus = 401;
  constructor() {
    super('The verification code is incorrect.');
  }
}

/** Refresh cookie missing, unknown, expired, or its session is gone. */
export class InvalidRefreshTokenError extends IdentityError {
  readonly code = 'AUTH_INVALID_REFRESH_TOKEN';
  readonly httpStatus = 401;
  constructor() {
    super('The refresh token is invalid or has expired.');
  }
}

/**
 * A rotated/revoked refresh token was presented — reuse detected. The whole
 * token family and its session are revoked before this error is raised
 * (security-architecture §2.3).
 */
export class RefreshTokenReusedError extends IdentityError {
  readonly code = 'AUTH_REFRESH_REUSE_DETECTED';
  readonly httpStatus = 401;
  constructor() {
    super('The refresh token is invalid or has expired.');
  }
}

/** Bearer token valid but the referenced user no longer exists / is disabled. */
export class UserNotFoundError extends IdentityError {
  readonly code = 'AUTH_USER_NOT_FOUND';
  readonly httpStatus = 401;
  constructor() {
    super('The authenticated user no longer exists.');
  }
}

/** Session id not found or not owned by the caller. */
export class SessionNotFoundError extends IdentityError {
  readonly code = 'AUTH_SESSION_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Session not found.');
  }
}

/** Passkey id not found or not owned by the caller. */
export class PasskeyNotFoundError extends IdentityError {
  readonly code = 'AUTH_PASSKEY_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Passkey not found.');
  }
}

/** WebAuthn attestation/assertion failed cryptographic verification. */
export class PasskeyVerificationFailedError extends IdentityError {
  readonly code = 'AUTH_PASSKEY_VERIFICATION_FAILED';
  readonly httpStatus = 400;
  constructor() {
    super('The passkey could not be verified.');
  }
}

/** WebAuthn challenge missing from the store (older than its 5 min TTL). */
export class WebauthnChallengeExpiredError extends IdentityError {
  readonly code = 'AUTH_WEBAUTHN_CHALLENGE_EXPIRED';
  readonly httpStatus = 400;
  constructor() {
    super('The WebAuthn challenge has expired. Restart the ceremony.');
  }
}

/** TOTP operation requires a pending/enabled secret that does not exist. */
export class TotpNotConfiguredError extends IdentityError {
  readonly code = 'AUTH_TOTP_NOT_CONFIGURED';
  readonly httpStatus = 400;
  constructor() {
    super('TOTP has not been set up for this account.');
  }
}

/** TOTP setup attempted while a confirmed secret is already active. */
export class TotpAlreadyEnabledError extends IdentityError {
  readonly code = 'AUTH_TOTP_ALREADY_ENABLED';
  readonly httpStatus = 409;
  constructor() {
    super('TOTP is already enabled for this account.');
  }
}

/** Wrong TOTP code presented while enabling TOTP (settings flow). */
export class InvalidTotpCodeError extends IdentityError {
  readonly code = 'AUTH_INVALID_TOTP_CODE';
  readonly httpStatus = 400;
  constructor() {
    super('The TOTP code is incorrect.');
  }
}
