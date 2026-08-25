import { sha256Hex } from './hash.js';

/**
 * Deterministic JSON serialisation for cryptographic sealing.
 *
 * Object keys are emitted in sorted order at every depth so the same logical
 * evidence bundle always produces byte-identical output — a prerequisite for a
 * reproducible, independently verifiable signature seal (PROJECT_MEMORY §2.9).
 * `undefined` properties are omitted; arrays keep their order.
 *
 * This mirrors the audit chain's `canonicalJson` but lives in `@dlv/crypto` so
 * the seal digest is computed identically by the signing service and by any
 * external verifier that only depends on this package.
 */
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) {
        sorted[key] = sortValue(source[key]);
      }
    }
    return sorted;
  }
  return value;
}

/**
 * Computes the seal digest for a signature evidence bundle: the SHA-256 (hex)
 * of its canonical serialisation. This digest is what the RFC 3161 timestamp
 * authority stamps, binding the signer identity, the signed document's content
 * hash, the captured signature and the consent record to a trusted time.
 *
 * @param evidence - The evidence bundle (plain, JSON-serialisable object).
 * @returns 64-character lowercase hex digest.
 */
export function sealDigestHex(evidence: unknown): string {
  return sha256Hex(canonicalStringify(evidence));
}
