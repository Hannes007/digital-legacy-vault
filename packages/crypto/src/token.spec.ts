import { describe, expect, it } from 'vitest';

import { generateOpaqueToken } from './index.js';

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

describe('generateOpaqueToken', () => {
  it('defaults to 32 bytes of entropy (43 base64url characters, no padding)', () => {
    const token = generateOpaqueToken();
    expect(token).toHaveLength(43);
    expect(token).toMatch(BASE64URL_PATTERN);
    expect(token).not.toContain('=');
  });

  it('honours a custom byte size (16 bytes → 22 characters)', () => {
    const token = generateOpaqueToken(16);
    expect(token).toHaveLength(22);
    expect(token).toMatch(BASE64URL_PATTERN);
  });

  it('honours a larger byte size (64 bytes → 86 characters)', () => {
    expect(generateOpaqueToken(64)).toHaveLength(86);
  });

  it('generates unique tokens (1000 draws, no collisions)', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      tokens.add(generateOpaqueToken());
    }
    expect(tokens.size).toBe(1000);
  });

  it('rejects zero bytes', () => {
    expect(() => generateOpaqueToken(0)).toThrow(RangeError);
  });

  it('rejects negative sizes', () => {
    expect(() => generateOpaqueToken(-8)).toThrow(RangeError);
  });

  it('rejects non-integer sizes', () => {
    expect(() => generateOpaqueToken(12.5)).toThrow(RangeError);
  });
});
