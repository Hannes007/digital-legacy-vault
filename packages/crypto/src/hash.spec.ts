import { describe, expect, it } from 'vitest';

import { hmacSha256Hex, sha256Hex } from './index.js';

describe('sha256Hex', () => {
  it('matches the known vector for the empty string', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('matches the known vector for "abc" (FIPS 180-2 B.1)', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('matches the known vector for "The quick brown fox jumps over the lazy dog"', () => {
    expect(sha256Hex('The quick brown fox jumps over the lazy dog')).toBe(
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
    );
  });

  it('hashes Uint8Array input identically to the equivalent UTF-8 string', () => {
    const bytes = new Uint8Array([0x61, 0x62, 0x63]); // "abc"
    expect(sha256Hex(bytes)).toBe(sha256Hex('abc'));
  });

  it('returns 64 lowercase hex characters', () => {
    expect(sha256Hex('anything')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hmacSha256Hex', () => {
  it('matches RFC 4231 test case 2 (string key "Jefe")', () => {
    expect(hmacSha256Hex('Jefe', 'what do ya want for nothing?')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
  });

  it('matches RFC 4231 test case 1 (byte key 20 x 0x0b)', () => {
    const key = new Uint8Array(20).fill(0x0b);
    expect(hmacSha256Hex(key, 'Hi There')).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    );
  });

  it('produces different MACs for different keys', () => {
    expect(hmacSha256Hex('key-a', 'message')).not.toBe(hmacSha256Hex('key-b', 'message'));
  });

  it('produces different MACs for different messages', () => {
    expect(hmacSha256Hex('key', 'message-a')).not.toBe(hmacSha256Hex('key', 'message-b'));
  });

  it('returns 64 lowercase hex characters', () => {
    expect(hmacSha256Hex('key', 'message')).toMatch(/^[0-9a-f]{64}$/);
  });
});
