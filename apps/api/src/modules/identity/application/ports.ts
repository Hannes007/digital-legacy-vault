import type { Role } from '@dlv/shared-types';

/**
 * Application-layer ports for the identity context (clean-architecture
 * boundary, coding-standards §layering): services depend on these interfaces,
 * never on Prisma or Redis directly. Infrastructure adapters implement them and
 * are bound to the tokens below in `identity.module.ts`.
 */

/** Lifecycle states a `User` row can hold (mirrors the Prisma `UserStatus` enum). */
export type UserStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION'
  | 'DECEASED_VERIFIED'
  | 'DELETED';

/** Rich, framework-free view of a user assembled from several tables. */
export interface UserRecord {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  firstName: string;
  lastName: string;
  status: UserStatus;
  /** Platform roles granted to the account. */
  roles: Role[];
  /** Count of active (non-revoked) WebAuthn credentials. */
  passkeyCount: number;
  /** True when a confirmed TOTP secret is active. */
  totpEnabled: boolean;
  /** Argon2id hash, or null if no password credential exists. */
  passwordHash: string | null;
  createdAt: Date;
}

/** Fields needed to create a fresh account + its password credential. */
export interface CreateUserInput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  defaultRole: Role;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  existsByEmail(email: string): Promise<boolean>;
  /** Atomically creates the user, its password credential and default role. */
  create(input: CreateUserInput): Promise<UserRecord>;
  /** Sets `email_verified_at` and promotes PENDING_VERIFICATION -> ACTIVE. */
  markEmailVerified(userId: string): Promise<void>;
}
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

/** Minimal session view used by the guard and refresh flow. */
export interface SessionRecord {
  id: string;
  userId: string;
  revokedAt: Date | null;
  expiresAt: Date;
}

export interface CreateSessionInput {
  id: string;
  userId: string;
  ip: string;
  ipMasked: string;
  userAgent: string;
  deviceLabel: string;
  /** Authentication methods reference, e.g. `['pwd']` or `['pwd','totp']`. */
  amr: string[];
  lastSeenAt: Date;
  expiresAt: Date;
}

/** Row shape for listing a user's active sessions (`GET /users/me/sessions`). */
export interface SessionListRow {
  id: string;
  deviceLabel: string;
  ipMasked: string;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<void>;
  findById(id: string): Promise<SessionRecord | null>;
  touch(id: string, lastSeenAt: Date): Promise<void>;
  revoke(id: string, when: Date): Promise<void>;
  /** Active (non-revoked, unexpired) sessions for a user, newest first. */
  listActiveByUser(userId: string, now: Date): Promise<SessionListRow[]>;
  /** Revoke a session the caller owns; false when not found / not theirs. */
  revokeOwned(id: string, userId: string, when: Date): Promise<boolean>;
}
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export type RefreshTokenStatus = 'ACTIVE' | 'ROTATED' | 'REVOKED';

export interface RefreshTokenRecord {
  id: string;
  sessionId: string;
  userId: string;
  familyId: string;
  status: RefreshTokenStatus;
  expiresAt: Date;
}

export interface CreateRefreshTokenInput {
  id: string;
  sessionId: string;
  userId: string;
  familyId: string;
  /** SHA-256 hex of the opaque token; the raw token is never persisted. */
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshTokenRepository {
  create(input: CreateRefreshTokenInput): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /** Marks the old token ROTATED and links it to its successor. */
  markRotated(oldId: string, newId: string): Promise<void>;
  /** Revokes every non-revoked token in a rotation family (reuse response). */
  revokeFamily(familyId: string): Promise<void>;
  /** Revokes every token bound to a session (logout / session revoke). */
  revokeBySession(sessionId: string): Promise<void>;
}
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

/**
 * Short-lived, single-use tokens kept in Redis (never in Postgres): the
 * email-verification token and the MFA continuation token.
 */
export interface EphemeralTokenStore {
  putEmailVerification(tokenHash: string, userId: string, ttlSeconds: number): Promise<void>;
  takeEmailVerification(tokenHash: string): Promise<string | null>;
  putMfa(token: string, userId: string, ttlSeconds: number): Promise<void>;
  takeMfa(token: string): Promise<string | null>;
}
export const EPHEMERAL_TOKEN_STORE = Symbol('EPHEMERAL_TOKEN_STORE');

/**
 * Per-account login-attempt accounting with exponential backoff
 * (phase-2-contracts: backoff after 5 failures, 2^n seconds capped at 15 min).
 * Keyed by a hash of the email so account existence never leaks via the key.
 */
export interface LoginAttemptGuard {
  isLocked(accountKey: string): Promise<boolean>;
  recordFailure(accountKey: string): Promise<void>;
  reset(accountKey: string): Promise<void>;
}
export const LOGIN_ATTEMPT_GUARD = Symbol('LOGIN_ATTEMPT_GUARD');
