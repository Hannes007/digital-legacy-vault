import { createHash, createHmac } from 'node:crypto';

/**
 * Computes the SHA-256 digest of `data` and returns it as lowercase hex.
 *
 * Used for content hashing in the upload pipeline (PROJECT_MEMORY §7.5) and
 * for the hash-chained audit trail
 * (`event_hash = sha256Hex(prev_hash + canonical_json)`, phase-2-contracts).
 *
 * @param data - UTF-8 string or raw bytes to hash.
 * @returns 64-character lowercase hex digest.
 */
export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Computes HMAC-SHA-256 of `data` under `key` and returns it as lowercase hex.
 *
 * Suitable for keyed integrity checks (e.g. webhook signatures, secure-link
 * verification). Not a password hash — use {@link hashPassword} for credentials.
 *
 * @param key - Secret key as a UTF-8 string or raw bytes.
 * @param data - UTF-8 message to authenticate.
 * @returns 64-character lowercase hex MAC.
 */
export function hmacSha256Hex(key: string | Uint8Array, data: string): string {
  return createHmac('sha256', key).update(data, 'utf8').digest('hex');
}
