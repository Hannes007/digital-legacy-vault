import { createHash, randomBytes } from 'node:crypto';

/**
 * Partner API keys (Phase 8): `dlv_sk_<43 base64url chars>`. Only the SHA-256
 * hash is persisted; the `prefix` (first 12 chars of the secret part) is the
 * public identifier shown in the UI and used for support lookups.
 */
const KEY_BYTES = 32;
export const API_KEY_PREFIX = 'dlv_sk_';

export interface GeneratedApiKey {
  /** The full secret shown exactly once. */
  apiKey: string;
  /** Public identifier (safe to store/display). */
  prefix: string;
  /** SHA-256 hex of the full secret — the only stored credential. */
  keyHash: string;
}

export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(KEY_BYTES).toString('base64url');
  const apiKey = `${API_KEY_PREFIX}${secret}`;
  return { apiKey, prefix: `${API_KEY_PREFIX}${secret.slice(0, 5)}`, keyHash: hashApiKey(apiKey) };
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey, 'utf8').digest('hex');
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(API_KEY_PREFIX) && value.length >= API_KEY_PREFIX.length + 32;
}
