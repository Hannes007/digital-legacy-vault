import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** Version prefix of the DLV field-encryption wire format. */
const FORMAT_PREFIX = 'dlv1';
/** AES-GCM IV length in bytes (NIST SP 800-38D recommended). */
const IV_BYTES = 12;
/** AES-GCM authentication-tag length in bytes. */
const TAG_BYTES = 16;
/** AES-256 key length in bytes. */
const KEY_BYTES = 32;
/** Strict unpadded base64url alphabet. */
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Error thrown by {@link FieldCipher} operations and
 * {@link createAesGcmFieldCipher} on any key-size, format, or
 * tamper/authentication problem.
 *
 * Messages are deliberately generic and never contain plaintext, key material
 * or ciphertext fragments (safe to surface in logs).
 */
export class FieldCipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FieldCipherError';
  }
}

/**
 * Symmetric cipher for field-level encryption of PII columns
 * (PROJECT_MEMORY §7.3 — ID numbers, crypto recovery refs, emergency contacts,
 * pending TOTP secrets).
 *
 * Wire format: `dlv1.<iv_b64url>.<tag_b64url>.<ct_b64url>` — versioned so the
 * format can evolve without ambiguity; all segments unpadded base64url.
 */
export interface FieldCipher {
  /**
   * Encrypts a UTF-8 plaintext with AES-256-GCM under a fresh random 12-byte IV.
   *
   * @param plaintext - Value to protect (empty string is allowed).
   * @param aad - Optional additional authenticated data (e.g. row id + column
   *   name); binds the ciphertext to its context without being stored in it.
   *   The exact same AAD must be supplied to {@link decrypt}.
   * @returns `dlv1.<iv_b64url>.<tag_b64url>.<ct_b64url>`.
   */
  encrypt(plaintext: string, aad?: string): string;

  /**
   * Decrypts and authenticates a `dlv1.…` ciphertext.
   *
   * @param ciphertext - Value produced by {@link encrypt}.
   * @param aad - The additional authenticated data used at encryption time, if any.
   * @returns The original UTF-8 plaintext.
   * @throws FieldCipherError on malformed input, version mismatch, wrong key,
   *   wrong/missing AAD, or any bit-level tampering (GCM tag failure).
   */
  decrypt(ciphertext: string, aad?: string): string;
}

/** Encodes bytes as unpadded base64url. */
function toBase64Url(bytes: Buffer): string {
  return bytes.toString('base64url');
}

/**
 * Decodes one non-empty ciphertext segment, rejecting non-base64url and
 * non-canonical encodings (which would allow ciphertext malleability).
 */
function decodeSegment(segment: string, label: string): Buffer {
  if (!BASE64URL_PATTERN.test(segment)) {
    throw new FieldCipherError(`Malformed ciphertext: ${label} segment is not base64url.`);
  }
  const decoded = Buffer.from(segment, 'base64url');
  if (toBase64Url(decoded) !== segment) {
    throw new FieldCipherError(`Malformed ciphertext: ${label} segment is not canonical base64url.`);
  }
  return decoded;
}

/**
 * Creates an AES-256-GCM {@link FieldCipher} bound to the given key.
 *
 * The key is copied defensively, so later mutation of the caller's array does
 * not affect the cipher. In cloud environments the key material comes from
 * KMS; locally from `FIELD_ENCRYPTION_KEY_B64` (see `@dlv/config`).
 *
 * @param key - Exactly 32 bytes of key material.
 * @throws FieldCipherError when the key is not exactly 32 bytes.
 */
export function createAesGcmFieldCipher(key: Uint8Array): FieldCipher {
  if (!(key instanceof Uint8Array) || key.byteLength !== KEY_BYTES) {
    throw new FieldCipherError(`Field-encryption key must be exactly ${String(KEY_BYTES)} bytes.`);
  }
  const keyBytes = Buffer.from(key);

  return {
    encrypt(plaintext: string, aad?: string): string {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv('aes-256-gcm', keyBytes, iv);
      if (aad !== undefined) {
        cipher.setAAD(Buffer.from(aad, 'utf8'));
      }
      const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return `${FORMAT_PREFIX}.${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(ciphertext)}`;
    },

    decrypt(ciphertext: string, aad?: string): string {
      const [prefix, ivSegment, tagSegment, ctSegment, ...rest] = ciphertext.split('.');
      if (prefix !== FORMAT_PREFIX) {
        throw new FieldCipherError('Malformed ciphertext: unsupported format or version.');
      }
      if (ivSegment === undefined || ivSegment === '') {
        throw new FieldCipherError('Malformed ciphertext: missing IV segment.');
      }
      if (tagSegment === undefined || tagSegment === '') {
        throw new FieldCipherError('Malformed ciphertext: missing auth-tag segment.');
      }
      if (ctSegment === undefined) {
        throw new FieldCipherError('Malformed ciphertext: missing payload segment.');
      }
      if (rest.length > 0) {
        throw new FieldCipherError('Malformed ciphertext: too many segments.');
      }

      const iv = decodeSegment(ivSegment, 'IV');
      const tag = decodeSegment(tagSegment, 'auth-tag');
      const data = ctSegment === '' ? Buffer.alloc(0) : decodeSegment(ctSegment, 'payload');

      if (iv.length !== IV_BYTES) {
        throw new FieldCipherError(`Malformed ciphertext: IV must be ${String(IV_BYTES)} bytes.`);
      }
      if (tag.length !== TAG_BYTES) {
        throw new FieldCipherError(`Malformed ciphertext: auth tag must be ${String(TAG_BYTES)} bytes.`);
      }

      try {
        const decipher = createDecipheriv('aes-256-gcm', keyBytes, iv);
        decipher.setAuthTag(tag);
        if (aad !== undefined) {
          decipher.setAAD(Buffer.from(aad, 'utf8'));
        }
        return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
      } catch {
        throw new FieldCipherError(
          'Decryption failed: data is corrupt, was tampered with, or the key/AAD does not match.',
        );
      }
    },
  };
}
