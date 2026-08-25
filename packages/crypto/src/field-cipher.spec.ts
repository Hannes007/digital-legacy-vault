import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { createAesGcmFieldCipher, FieldCipherError } from './index.js';

const KEY = Buffer.from(
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
  'hex',
);

const FORMAT_PATTERN = /^dlv1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;

/** Flips the lowest bit of byte `index` inside one base64url segment. */
function flipByteInSegment(ciphertext: string, segmentIndex: number, byteIndex = 0): string {
  const segments = ciphertext.split('.');
  const original = segments[segmentIndex];
  if (original === undefined) {
    throw new Error(`test setup: no segment at index ${String(segmentIndex)}`);
  }
  const bytes = Buffer.from(original, 'base64url');
  const target = bytes[byteIndex];
  if (target === undefined) {
    throw new Error(`test setup: no byte at index ${String(byteIndex)}`);
  }
  bytes[byteIndex] = target ^ 0x01;
  segments[segmentIndex] = bytes.toString('base64url');
  return segments.join('.');
}

describe('createAesGcmFieldCipher', () => {
  it('accepts a 32-byte key (Buffer and plain Uint8Array)', () => {
    expect(() => createAesGcmFieldCipher(KEY)).not.toThrow();
    expect(() => createAesGcmFieldCipher(new Uint8Array(32).fill(7))).not.toThrow();
  });

  it('rejects keys that are not 32 bytes', () => {
    expect(() => createAesGcmFieldCipher(new Uint8Array(16))).toThrow(FieldCipherError);
    expect(() => createAesGcmFieldCipher(new Uint8Array(31))).toThrow(FieldCipherError);
    expect(() => createAesGcmFieldCipher(new Uint8Array(33))).toThrow(FieldCipherError);
    expect(() => createAesGcmFieldCipher(new Uint8Array(0))).toThrow(FieldCipherError);
  });

  it('rejects non-Uint8Array key material', () => {
    expect(() => createAesGcmFieldCipher(null as unknown as Uint8Array)).toThrow(FieldCipherError);
  });

  it('copies the key defensively (mutating the source array does not break the cipher)', () => {
    const keySource = new Uint8Array(32).fill(9);
    const cipher = createAesGcmFieldCipher(keySource);
    const token = cipher.encrypt('stable');
    keySource.fill(0);
    expect(cipher.decrypt(token)).toBe('stable');
  });
});

describe('FieldCipher round-trips', () => {
  const cipher = createAesGcmFieldCipher(KEY);

  it('round-trips a simple string', () => {
    const token = cipher.encrypt('8001015009087'); // SA ID number shape
    expect(token).toMatch(FORMAT_PATTERN);
    expect(cipher.decrypt(token)).toBe('8001015009087');
  });

  it('round-trips unicode', () => {
    const plaintext = 'naïve — 秘密 — 🔑';
    expect(cipher.decrypt(cipher.encrypt(plaintext))).toBe(plaintext);
  });

  it('round-trips the empty string', () => {
    const token = cipher.encrypt('');
    expect(token).toMatch(FORMAT_PATTERN);
    expect(cipher.decrypt(token)).toBe('');
  });

  it('round-trips a long value (64 KiB)', () => {
    const plaintext = 'x'.repeat(64 * 1024);
    expect(cipher.decrypt(cipher.encrypt(plaintext))).toBe(plaintext);
  });

  it('round-trips with AAD', () => {
    const token = cipher.encrypt('secret', 'users.id_number:018f1c2a');
    expect(cipher.decrypt(token, 'users.id_number:018f1c2a')).toBe('secret');
  });

  it('uses a fresh IV per call (same plaintext → different ciphertexts)', () => {
    const first = cipher.encrypt('same');
    const second = cipher.encrypt('same');
    expect(first).not.toBe(second);
    const firstIv = first.split('.')[1];
    const secondIv = second.split('.')[1];
    expect(firstIv).not.toBe(secondIv);
  });

  it('decrypts with a second cipher instance created from the same key', () => {
    const other = createAesGcmFieldCipher(Buffer.from(KEY));
    expect(other.decrypt(cipher.encrypt('portable'))).toBe('portable');
  });

  it('emits a 12-byte IV and a 16-byte tag', () => {
    const [, ivSegment, tagSegment] = cipher.encrypt('sized').split('.');
    expect(Buffer.from(ivSegment ?? '', 'base64url')).toHaveLength(12);
    expect(Buffer.from(tagSegment ?? '', 'base64url')).toHaveLength(16);
  });
});

describe('FieldCipher tamper detection', () => {
  const cipher = createAesGcmFieldCipher(KEY);

  it('detects a flipped byte in the IV segment', () => {
    const token = cipher.encrypt('sensitive');
    expect(() => cipher.decrypt(flipByteInSegment(token, 1))).toThrow(FieldCipherError);
  });

  it('detects a flipped byte in the auth-tag segment', () => {
    const token = cipher.encrypt('sensitive');
    expect(() => cipher.decrypt(flipByteInSegment(token, 2))).toThrow(FieldCipherError);
  });

  it('detects a flipped byte in the payload segment', () => {
    const token = cipher.encrypt('sensitive');
    expect(() => cipher.decrypt(flipByteInSegment(token, 3))).toThrow(FieldCipherError);
  });

  it('detects a flipped byte at the end of the payload', () => {
    const token = cipher.encrypt('a longer sensitive value');
    const payload = Buffer.from(token.split('.')[3] ?? '', 'base64url');
    expect(() => cipher.decrypt(flipByteInSegment(token, 3, payload.length - 1))).toThrow(
      FieldCipherError,
    );
  });

  it('rejects decryption with the wrong key', () => {
    const token = cipher.encrypt('sensitive');
    const wrongKey = createAesGcmFieldCipher(randomBytes(32));
    expect(() => wrongKey.decrypt(token)).toThrow(FieldCipherError);
  });

  it('rejects the wrong AAD', () => {
    const token = cipher.encrypt('sensitive', 'context-a');
    expect(() => cipher.decrypt(token, 'context-b')).toThrow(FieldCipherError);
  });

  it('rejects a missing AAD when one was used at encryption time', () => {
    const token = cipher.encrypt('sensitive', 'context-a');
    expect(() => cipher.decrypt(token)).toThrow(FieldCipherError);
  });

  it('rejects an unexpected AAD when none was used at encryption time', () => {
    const token = cipher.encrypt('sensitive');
    expect(() => cipher.decrypt(token, 'context-a')).toThrow(FieldCipherError);
  });

  it('rejects a swapped IV from another ciphertext', () => {
    const a = cipher.encrypt('value-a').split('.');
    const b = cipher.encrypt('value-b').split('.');
    const franken = [a[0], b[1], a[2], a[3]].join('.');
    expect(() => cipher.decrypt(franken)).toThrow(FieldCipherError);
  });
});

describe('FieldCipher format rejection', () => {
  const cipher = createAesGcmFieldCipher(KEY);

  it.each([
    ['plain garbage', 'garbage'],
    ['empty string', ''],
    ['wrong version prefix', 'dlv2.aaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbb.cccc'],
    ['missing IV segment entirely', 'dlv1'],
    ['empty IV segment', 'dlv1..bbbbbbbbbbbbbbbbbbbbbb.cccc'],
    ['missing tag segment entirely', 'dlv1.aaaaaaaaaaaaaaaa'],
    ['empty tag segment', 'dlv1.aaaaaaaaaaaaaaaa..cccc'],
    ['missing payload segment', 'dlv1.aaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbb'],
    ['too many segments', 'dlv1.aaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbb.cccc.dddd'],
    ['non-base64url IV characters', 'dlv1.$$$$$$$$$$$$$$$$.bbbbbbbbbbbbbbbbbbbbbb.cccc'],
    ['non-canonical base64url IV', 'dlv1.A.bbbbbbbbbbbbbbbbbbbbbb.cccc'],
  ])('rejects %s', (_label, malformed) => {
    expect(() => cipher.decrypt(malformed)).toThrow(FieldCipherError);
  });

  it('rejects an IV of the wrong byte length', () => {
    const token = cipher.encrypt('sensitive');
    const segments = token.split('.');
    segments[1] = Buffer.alloc(8, 1).toString('base64url');
    expect(() => cipher.decrypt(segments.join('.'))).toThrow(/IV must be 12 bytes/);
  });

  it('rejects an auth tag of the wrong byte length', () => {
    const token = cipher.encrypt('sensitive');
    const segments = token.split('.');
    segments[2] = Buffer.alloc(8, 1).toString('base64url');
    expect(() => cipher.decrypt(segments.join('.'))).toThrow(/auth tag must be 16 bytes/);
  });

  it('rejects a non-base64url payload segment', () => {
    const token = cipher.encrypt('sensitive');
    const segments = token.split('.');
    segments[3] = '===';
    expect(() => cipher.decrypt(segments.join('.'))).toThrow(FieldCipherError);
  });
});

describe('FieldCipherError', () => {
  it('is an Error subclass with a stable name', () => {
    const error = new FieldCipherError('boom');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('FieldCipherError');
    expect(error.message).toBe('boom');
  });
});
