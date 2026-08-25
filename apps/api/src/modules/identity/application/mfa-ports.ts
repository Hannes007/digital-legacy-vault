/**
 * Application-layer ports for MFA (TOTP, recovery codes, WebAuthn passkeys).
 * Kept separate from `ports.ts` for readability; adapters bind these tokens in
 * `identity.module.ts`.
 */

export type TotpStatus = 'PENDING' | 'ENABLED';

export interface TotpSecretRecord {
  userId: string;
  /** `@dlv/crypto` FieldCipher output; AAD = `totp:<userId>`. */
  secretEnc: string;
  status: TotpStatus;
}

export interface TotpSecretRepository {
  findByUser(userId: string): Promise<TotpSecretRecord | null>;
  /** Create or replace the (single) secret for a user, in PENDING status. */
  upsertPending(userId: string, secretEnc: string): Promise<void>;
  enable(userId: string, confirmedAt: Date): Promise<void>;
  deleteByUser(userId: string): Promise<void>;
}
export const TOTP_SECRET_REPOSITORY = Symbol('TOTP_SECRET_REPOSITORY');

export interface RecoveryCodeRow {
  id: string;
  codeHash: string;
}
export interface RecoveryCodeRepository {
  /** Atomically replace all of a user's recovery codes with a new set. */
  replaceAll(userId: string, codes: { id: string; codeHash: string }[]): Promise<void>;
  listUnused(userId: string): Promise<RecoveryCodeRow[]>;
  markUsed(id: string, when: Date): Promise<void>;
  deleteByUser(userId: string): Promise<void>;
}
export const RECOVERY_CODE_REPOSITORY = Symbol('RECOVERY_CODE_REPOSITORY');

export interface CreateWebauthnCredentialInput {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: Uint8Array;
  signCount: number;
  transports: string[] | null;
  deviceType: string | null;
  backedUp: boolean;
  aaguid: string | null;
  deviceLabel: string;
}

export interface WebauthnCredentialAuthRecord {
  id: string;
  userId: string;
  publicKey: Uint8Array;
  signCount: number;
  transports: string[] | null;
}

export interface WebauthnCredentialListRow {
  id: string;
  deviceLabel: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface WebauthnCredentialRepository {
  create(input: CreateWebauthnCredentialInput): Promise<void>;
  findByCredentialId(credentialId: string): Promise<WebauthnCredentialAuthRecord | null>;
  listActiveByUser(userId: string): Promise<WebauthnCredentialListRow[]>;
  /** Credential ids (base64url) of a user's active passkeys, for allow/exclude lists. */
  activeCredentialIds(userId: string): Promise<string[]>;
  updateOnAuth(id: string, signCount: number, lastUsedAt: Date): Promise<void>;
  /** Revoke a passkey the caller owns; false when it does not exist / not theirs. */
  revokeOwned(id: string, userId: string, when: Date): Promise<boolean>;
  countActiveByUser(userId: string): Promise<number>;
}
export const WEBAUTHN_CREDENTIAL_REPOSITORY = Symbol('WEBAUTHN_CREDENTIAL_REPOSITORY');

/** Short-lived WebAuthn ceremony challenges (Redis, 5 min TTL). */
export interface WebauthnChallengeStore {
  putRegistration(userId: string, challenge: string, ttlSeconds: number): Promise<void>;
  takeRegistration(userId: string): Promise<string | null>;
  putAuthentication(challenge: string, ttlSeconds: number): Promise<void>;
  /** True if the challenge was present (and it is consumed). */
  takeAuthentication(challenge: string): Promise<boolean>;
}
export const WEBAUTHN_CHALLENGE_STORE = Symbol('WEBAUTHN_CHALLENGE_STORE');
