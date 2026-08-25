/**
 * PasswordHash value object — an opaque, already-hashed credential string
 * (Argon2id via `@dlv/crypto.hashPassword`; the domain never sees plaintext
 * passwords and never performs hashing itself).
 */
export class PasswordHash {
  private constructor(
    /** Encoded hash string (PHC format for Argon2id). */
    public readonly value: string,
  ) {}

  /**
   * Wrap an encoded hash produced by the PasswordHasher port.
   *
   * @throws {Error} when the value is empty — an empty hash would make every
   * verification fail open or closed in surprising ways.
   */
  static create(encoded: string): PasswordHash {
    if (!encoded || encoded.trim().length === 0) {
      throw new Error('PasswordHash cannot be empty.');
    }
    return new PasswordHash(encoded);
  }
}
