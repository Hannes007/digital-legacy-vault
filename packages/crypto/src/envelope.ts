import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Envelope encryption for document content (PROJECT_MEMORY §7.2).
 *
 * Each document version gets a fresh 256-bit Data Encryption Key (DEK). The DEK
 * encrypts the content with AES-256-GCM; the DEK itself is then wrapped by a KMS
 * CMK (in the app's KmsPort) and stored alongside the ciphertext — the plaintext
 * DEK is never persisted. This module owns the symmetric primitives; KMS wrap /
 * unwrap is an infrastructure concern injected by the caller.
 */
const IV_BYTES = 12;
const TAG_BYTES = 16;
const DEK_BYTES = 32;

export class EnvelopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvelopeError';
  }
}

/** An encrypted blob: everything needed to decrypt given the (unwrapped) DEK. */
export interface EncryptedBlob {
  /** AES-256-GCM ciphertext. */
  ciphertext: Uint8Array;
  /** 12-byte random IV. */
  iv: Uint8Array;
  /** 16-byte GCM authentication tag. */
  tag: Uint8Array;
}

/** Generate a fresh 32-byte Data Encryption Key. */
export function generateDek(): Uint8Array {
  return new Uint8Array(randomBytes(DEK_BYTES));
}

function assertDek(dek: Uint8Array): Buffer {
  if (!(dek instanceof Uint8Array) || dek.byteLength !== DEK_BYTES) {
    throw new EnvelopeError(`DEK must be exactly ${String(DEK_BYTES)} bytes.`);
  }
  return Buffer.from(dek);
}

/**
 * Encrypt document bytes with the given DEK under a fresh IV.
 * @param aad - optional additional authenticated data (e.g. `documentId:version`)
 *   binding the ciphertext to its identity; must be supplied identically to decrypt.
 */
export function encryptContent(dek: Uint8Array, plaintext: Uint8Array, aad?: string): EncryptedBlob {
  const key = assertDek(dek);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  if (aad !== undefined) cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  return { ciphertext: new Uint8Array(ciphertext), iv: new Uint8Array(iv), tag: new Uint8Array(cipher.getAuthTag()) };
}

/** Decrypt+authenticate a blob with the given DEK. Throws on tamper/wrong key/AAD. */
export function decryptContent(dek: Uint8Array, blob: EncryptedBlob, aad?: string): Uint8Array {
  const key = assertDek(dek);
  if (blob.iv.byteLength !== IV_BYTES) throw new EnvelopeError('IV must be 12 bytes.');
  if (blob.tag.byteLength !== TAG_BYTES) throw new EnvelopeError('Auth tag must be 16 bytes.');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv));
    decipher.setAuthTag(Buffer.from(blob.tag));
    if (aad !== undefined) decipher.setAAD(Buffer.from(aad, 'utf8'));
    const out = Buffer.concat([decipher.update(Buffer.from(blob.ciphertext)), decipher.final()]);
    return new Uint8Array(out);
  } catch {
    throw new EnvelopeError('Content decryption failed: corrupt, tampered, or wrong key/AAD.');
  }
}

/**
 * Local/dev DEK wrapping with an AES-256-GCM Key-Encryption Key (KEK). In cloud
 * environments the KmsPort wraps the DEK with a KMS CMK instead; this deterministic
 * software wrap keeps local development and unit tests self-contained.
 * Wire format: iv(12) || tag(16) || wrappedKey, base64.
 */
export function wrapDekWithKek(kek: Uint8Array, dek: Uint8Array): string {
  const blob = encryptContent(assertKek(kek), dek, 'dlv:dek-wrap');
  return Buffer.concat([Buffer.from(blob.iv), Buffer.from(blob.tag), Buffer.from(blob.ciphertext)]).toString('base64');
}

export function unwrapDekWithKek(kek: Uint8Array, wrapped: string): Uint8Array {
  const raw = Buffer.from(wrapped, 'base64');
  if (raw.byteLength < IV_BYTES + TAG_BYTES) throw new EnvelopeError('Malformed wrapped DEK.');
  const iv = new Uint8Array(raw.subarray(0, IV_BYTES));
  const tag = new Uint8Array(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  const ciphertext = new Uint8Array(raw.subarray(IV_BYTES + TAG_BYTES));
  return decryptContent(assertKek(kek), { iv, tag, ciphertext }, 'dlv:dek-wrap');
}

function assertKek(kek: Uint8Array): Uint8Array {
  if (!(kek instanceof Uint8Array) || kek.byteLength !== DEK_BYTES) {
    throw new EnvelopeError(`KEK must be exactly ${String(DEK_BYTES)} bytes.`);
  }
  return kek;
}
