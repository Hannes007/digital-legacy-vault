import { describe, expect, it } from 'vitest';

import { sha256Hex } from './hash.js';
import { canonicalStringify, sealDigestHex } from './seal.js';

describe('canonicalStringify', () => {
  it('sorts object keys at every depth so digests are order-independent', () => {
    const a = { b: 1, a: { d: 4, c: 3 } };
    const b = { a: { c: 3, d: 4 }, b: 1 };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it('omits undefined properties but preserves array order', () => {
    expect(canonicalStringify({ a: undefined, b: [3, 1, 2] })).toBe('{"b":[3,1,2]}');
  });
});

describe('sealDigestHex', () => {
  it('is the SHA-256 of the canonical serialisation', () => {
    const evidence = { signer: 'u1', doc: 'd1' };
    expect(sealDigestHex(evidence)).toBe(sha256Hex(canonicalStringify(evidence)));
  });

  it('is stable across logically-equal bundles and changes on tamper', () => {
    const original = { signer: 'u1', documentSha256: 'abc', method: 'DRAW' };
    const reordered = { method: 'DRAW', documentSha256: 'abc', signer: 'u1' };
    const tampered = { signer: 'u1', documentSha256: 'abd', method: 'DRAW' };
    expect(sealDigestHex(original)).toBe(sealDigestHex(reordered));
    expect(sealDigestHex(original)).not.toBe(sealDigestHex(tampered));
  });
});
