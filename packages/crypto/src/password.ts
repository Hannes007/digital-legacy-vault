import argon2 from 'argon2';

/**
 * Fixed Argon2id parameters per phase-2-contracts §@dlv/crypto
 * (OWASP-recommended profile: m=19456 KiB, t=2, p=1).
 * Changing these requires a contracts-doc update first.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Hashes a password with Argon2id (m=19456 KiB, t=2, p=1).
 *
 * The returned PHC-format string embeds algorithm, parameters and a random
 * salt, so it is self-describing and safe to persist as-is.
 *
 * @param password - Plaintext password (validated for policy at the boundary).
 * @returns PHC-format hash string (e.g. `$argon2id$v=19$m=19456,t=2,p=1$…`).
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a password against a stored Argon2 PHC hash in constant time
 * (delegated to the argon2 native implementation).
 *
 * Deliberately returns `false` instead of throwing for malformed or foreign
 * hashes: callers get a uniform pass/fail signal and cannot leak storage
 * details through error paths (no user enumeration, phase-2-contracts).
 *
 * @param hash - Stored PHC-format hash string.
 * @param password - Plaintext candidate password.
 * @returns True only when the password matches the hash.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
