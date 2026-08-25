import { describe, expect, it } from 'vitest';
import { isUuid, isUuidV7, uuidv7 } from './index.js';

describe('uuidv7', () => {
  it('generates valid, version-7, time-ordered ids', () => {
    const a = uuidv7(1000);
    const b = uuidv7(2000);
    expect(isUuid(a)).toBe(true);
    expect(isUuidV7(a)).toBe(true);
    expect(a.charAt(14)).toBe('7');
    // earlier timestamp sorts before later
    expect(a < b).toBe(true);
  });
  it('rejects non-uuid and non-v7', () => {
    expect(isUuid('nope')).toBe(false);
    expect(isUuidV7('00000000-0000-4000-8000-000000000000')).toBe(false);
  });
});
