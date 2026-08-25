import { describe, expect, it } from 'vitest';
import {
  EnvelopeError,
  decryptContent,
  encryptContent,
  generateDek,
  unwrapDekWithKek,
  wrapDekWithKek,
} from './index.js';

const bytes = (s: string) => new Uint8Array(Buffer.from(s, 'utf8'));

describe('envelope encryption', () => {
  it('round-trips content with AAD', () => {
    const dek = generateDek();
    expect(dek.byteLength).toBe(32);
    const blob = encryptContent(dek, bytes('top secret will'), 'doc-1:v1');
    expect(Buffer.from(blob.ciphertext).toString('utf8')).not.toContain('secret');
    expect(Buffer.from(decryptContent(dek, blob, 'doc-1:v1')).toString('utf8')).toBe('top secret will');
  });

  it('round-trips content without AAD', () => {
    const dek = generateDek();
    const blob = encryptContent(dek, bytes('no aad here'));
    expect(Buffer.from(decryptContent(dek, blob)).toString('utf8')).toBe('no aad here');
  });

  it('rejects wrong AAD and tampered ciphertext', () => {
    const dek = generateDek();
    const blob = encryptContent(dek, bytes('data'), 'doc-1:v1');
    expect(() => decryptContent(dek, blob, 'doc-1:v2')).toThrow(EnvelopeError);
    const tampered = { ...blob, ciphertext: new Uint8Array([...blob.ciphertext].map((b, i) => (i === 0 ? b ^ 1 : b))) };
    expect(() => decryptContent(dek, tampered, 'doc-1:v1')).toThrow(EnvelopeError);
  });

  it('rejects malformed IV / tag lengths', () => {
    const dek = generateDek();
    const blob = encryptContent(dek, bytes('x'));
    expect(() => decryptContent(dek, { ...blob, iv: new Uint8Array(11) })).toThrow(/IV must be 12/);
    expect(() => decryptContent(dek, { ...blob, tag: new Uint8Array(15) })).toThrow(/tag must be 16/);
  });

  it('validates key sizes on encrypt and decrypt', () => {
    expect(() => encryptContent(new Uint8Array(16), bytes('x'))).toThrow(EnvelopeError);
    const blob = encryptContent(generateDek(), bytes('x'));
    expect(() => decryptContent(new Uint8Array(16), blob)).toThrow(EnvelopeError);
  });

  it('wraps and unwraps the DEK with a KEK', () => {
    const kek = generateDek();
    const dek = generateDek();
    const wrapped = wrapDekWithKek(kek, dek);
    expect(unwrapDekWithKek(kek, wrapped)).toEqual(dek);
    expect(() => unwrapDekWithKek(generateDek(), wrapped)).toThrow(EnvelopeError);
  });

  it('rejects a bad KEK size and a malformed wrapped DEK', () => {
    expect(() => wrapDekWithKek(new Uint8Array(16), generateDek())).toThrow(/KEK must be exactly/);
    expect(() => unwrapDekWithKek(generateDek(), Buffer.from('short').toString('base64'))).toThrow(/Malformed wrapped DEK/);
  });
});
