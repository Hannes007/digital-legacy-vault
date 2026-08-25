import { randomBytes, timingSafeEqual } from 'node:crypto';

import { hmacSha256Hex } from './hash.js';

/**
 * RFC 3161 trusted-timestamp primitives for the signature seal
 * (PROJECT_MEMORY §2.9).
 *
 * Two paths are supported, mirroring the envelope-encryption KMS-with-dev-KEK
 * pattern used elsewhere:
 *
 *  - Real TSA: buildTimeStampReq produces a standards-correct DER TimeStampReq
 *    whose message imprint is the SHA-256 of the seal digest. The adapter POSTs
 *    it to a configured RFC 3161 authority and stores the returned token; full
 *    validation of an external token happens against the TSA certificate chain
 *    in production.
 *  - Dev / offline fallback: issueDevTimestampToken mints a self-issued,
 *    HMAC-authenticated token that verifyDevTimestampToken validates with no
 *    network — so the verification tool and CI prove the whole flow end-to-end.
 */

/** SHA-256 hex imprint (64 lowercase hex chars). */
const IMPRINT_HEX_LENGTH = 64;
const HEX_PATTERN = /^[0-9a-f]+$/;

/** DER object identifier bytes for id-sha256 (2.16.840.1.101.3.4.2.1). */
const SHA256_OID = [0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01];

/** A self-issued, verifiable timestamp token used when no external TSA is set. */
export interface DevTimestampToken {
  authority: 'dev-local';
  algorithm: 'SHA-256';
  digest: string;
  genTime: string;
  nonce: string;
  mac: string;
}

/**
 * DER definite-length encoding. Short form for lengths < 128, long form
 * otherwise. Exported for unit testing (not part of the public @dlv/crypto
 * surface): a fixed 32-byte SHA-256 imprint only ever exercises the short form
 * in practice, so the long form is validated directly.
 */
export function encodeDerLength(length: number): number[] {
  if (length < 0x80) return [length];
  const bytes: number[] = [];
  let value = length;
  while (value > 0) {
    bytes.unshift(value & 0xff);
    value >>>= 8;
  }
  return [0x80 | bytes.length, ...bytes];
}

/** DER tag-length-value wrapper. */
function tlv(tag: number, content: number[]): number[] {
  return [tag, ...encodeDerLength(content.length), ...content];
}

function assertImprint(digestHex: string): void {
  if (digestHex.length !== IMPRINT_HEX_LENGTH || !HEX_PATTERN.test(digestHex)) {
    throw new RangeError('Timestamp imprint must be a 64-character lowercase hex SHA-256 digest.');
  }
}

/**
 * Builds an RFC 3161 TimeStampReq (DER) for the given SHA-256 seal digest.
 * Structure: SEQUENCE { version(1), messageImprint SEQUENCE { AlgId(sha256),
 * OCTET STRING(digest) }, certReq BOOLEAN TRUE }.
 */
export function buildTimeStampReq(digestHex: string): Uint8Array {
  assertImprint(digestHex);
  const digestBytes = [...Buffer.from(digestHex, 'hex')];

  const algorithmIdentifier = tlv(0x30, [...SHA256_OID, 0x05, 0x00]);
  const hashedMessage = tlv(0x04, digestBytes);
  const messageImprint = tlv(0x30, [...algorithmIdentifier, ...hashedMessage]);
  const version = [0x02, 0x01, 0x01];
  const certReq = [0x01, 0x01, 0xff];

  return Uint8Array.from(tlv(0x30, [...version, ...messageImprint, ...certReq]));
}

/** Canonical, MAC-free serialisation of a dev token (stable field order). */
function tokenSigningInput(token: Omit<DevTimestampToken, 'mac'>): string {
  return [token.authority, token.algorithm, token.digest, token.genTime, token.nonce].join('|');
}

/**
 * Mints a self-issued dev timestamp token over digestHex, authenticated with an
 * HMAC under key. Fully verifiable offline for development, tests and the
 * verification tool.
 */
export function issueDevTimestampToken(
  digestHex: string,
  key: string | Uint8Array,
  genTime: Date = new Date(),
): DevTimestampToken {
  assertImprint(digestHex);
  const unsigned: Omit<DevTimestampToken, 'mac'> = {
    authority: 'dev-local',
    algorithm: 'SHA-256',
    digest: digestHex,
    genTime: genTime.toISOString(),
    nonce: randomBytes(16).toString('base64url'),
  };
  return { ...unsigned, mac: hmacSha256Hex(key, tokenSigningInput(unsigned)) };
}

/**
 * Verifies a dev timestamp token: recomputes the HMAC under key and compares it
 * to the token's mac in constant time. Returns false for any tampering
 * (including a mismatched digest) rather than throwing.
 */
export function verifyDevTimestampToken(
  token: DevTimestampToken,
  key: string | Uint8Array,
  expectedDigestHex?: string,
): boolean {
  if (token.authority !== 'dev-local' || token.algorithm !== 'SHA-256') return false;
  if (expectedDigestHex !== undefined && token.digest !== expectedDigestHex) return false;
  const expected = hmacSha256Hex(key, tokenSigningInput(token));
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(token.mac, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
