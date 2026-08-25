import { randomBytes } from 'node:crypto';

/**
 * Generates a cryptographically secure opaque token, base64url encoded
 * (unpadded). Used for refresh-token identifiers, MFA continuation tokens,
 * email-verification tokens and secure-link secrets.
 *
 * Never use `Math.random()` for anything security-relevant
 * (coding-standards §10.9) — this is the sanctioned source of random tokens.
 *
 * @param bytes - Entropy size in bytes. Defaults to 32 (256 bits → 43 chars).
 * @returns Unpadded base64url string.
 * @throws RangeError when `bytes` is not a positive integer.
 */
export function generateOpaqueToken(bytes = 32): string {
  if (!Number.isInteger(bytes) || bytes <= 0) {
    throw new RangeError('Token size must be a positive integer number of bytes.');
  }
  return randomBytes(bytes).toString('base64url');
}
