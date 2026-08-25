import { describe, expect, it } from 'vitest';

import {
  buildTimeStampReq,
  encodeDerLength,
  issueDevTimestampToken,
  verifyDevTimestampToken,
  type DevTimestampToken,
} from './timestamp.js';

const DIGEST = 'a'.repeat(64);
const KEY = 'seal-hmac-key';

describe('buildTimeStampReq (RFC 3161)', () => {
  it('produces a DER SEQUENCE embedding the SHA-256 OID and 32-byte imprint', () => {
    const der = buildTimeStampReq(DIGEST);
    expect(der[0]).toBe(0x30);
    const oid = Buffer.from([0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01]);
    expect(Buffer.from(der).includes(oid)).toBe(true);
    expect(Buffer.from(der).includes(Buffer.from(DIGEST, 'hex'))).toBe(true);
  });

  it('rejects a non-SHA-256-shaped imprint', () => {
    expect(() => buildTimeStampReq('deadbeef')).toThrow(RangeError);
  });
});

describe('encodeDerLength', () => {
  it('uses short form below 128', () => {
    expect(encodeDerLength(0)).toEqual([0]);
    expect(encodeDerLength(127)).toEqual([127]);
  });

  it('uses long form at or above 128', () => {
    expect(encodeDerLength(200)).toEqual([0x81, 0xc8]);
    expect(encodeDerLength(300)).toEqual([0x82, 0x01, 0x2c]);
  });
});

describe('dev timestamp token', () => {
  it('issues a token that verifies under the same key', () => {
    const token = issueDevTimestampToken(DIGEST, KEY);
    expect(token.authority).toBe('dev-local');
    expect(verifyDevTimestampToken(token, KEY)).toBe(true);
    expect(verifyDevTimestampToken(token, KEY, DIGEST)).toBe(true);
  });

  it('fails verification under a different key', () => {
    const token = issueDevTimestampToken(DIGEST, KEY);
    expect(verifyDevTimestampToken(token, 'wrong-key')).toBe(false);
  });

  it('fails when the stamped digest is tampered', () => {
    const token = issueDevTimestampToken(DIGEST, KEY);
    const tampered = { ...token, digest: 'b'.repeat(64) };
    expect(verifyDevTimestampToken(tampered, KEY)).toBe(false);
  });

  it('fails when bound to an unexpected digest', () => {
    const token = issueDevTimestampToken(DIGEST, KEY);
    expect(verifyDevTimestampToken(token, KEY, 'c'.repeat(64))).toBe(false);
  });

  it('rejects a token with the wrong authority', () => {
    const token = issueDevTimestampToken(DIGEST, KEY);
    const forged = { ...token, authority: 'evil' } as unknown as DevTimestampToken;
    expect(verifyDevTimestampToken(forged, KEY)).toBe(false);
  });

  it('rejects a token with the wrong algorithm', () => {
    const token = issueDevTimestampToken(DIGEST, KEY);
    const forged = { ...token, algorithm: 'MD5' } as unknown as DevTimestampToken;
    expect(verifyDevTimestampToken(forged, KEY)).toBe(false);
  });

  it('rejects a token whose mac length is wrong', () => {
    const token = issueDevTimestampToken(DIGEST, KEY);
    expect(verifyDevTimestampToken({ ...token, mac: 'short' }, KEY)).toBe(false);
  });

  it('records the supplied generation time', () => {
    const when = new Date('2026-07-13T10:00:00.000Z');
    expect(issueDevTimestampToken(DIGEST, KEY, when).genTime).toBe('2026-07-13T10:00:00.000Z');
  });
});
