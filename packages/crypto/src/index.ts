/**
 * @dlv/crypto — ALL cryptographic primitives for Digital Legacy Vault.
 *
 * Security invariant (coding-standards §10.3): application code must never
 * import `node:crypto` directly; every hash, MAC, token and cipher operation
 * goes through this package so parameters stay centrally auditable.
 */

export { sha256Hex, hmacSha256Hex } from './hash.js';
export { generateOpaqueToken } from './token.js';
export { hashPassword, verifyPassword } from './password.js';
export { createAesGcmFieldCipher, FieldCipherError } from './field-cipher.js';
export type { FieldCipher } from './field-cipher.js';

export {
  EnvelopeError,
  generateDek,
  encryptContent,
  decryptContent,
  wrapDekWithKek,
  unwrapDekWithKek,
} from './envelope.js';
export type { EncryptedBlob } from './envelope.js';

export { ShamirError, splitSecret, combineShares } from './shamir.js';
export type { SplitOptions } from './shamir.js';

export { canonicalStringify, sealDigestHex } from './seal.js';
export {
  buildTimeStampReq,
  issueDevTimestampToken,
  verifyDevTimestampToken,
} from './timestamp.js';
export type { DevTimestampToken } from './timestamp.js';
