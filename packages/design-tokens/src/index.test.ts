import { describe, expect, it } from 'vitest';
import { primitives, semantic, tokens, radius, zIndex } from './index';

describe('design-tokens', () => {
  it('resolves semantic aliases to primitive values', () => {
    expect(semantic.light.accent).toBe(primitives.blue[600]);
    expect(semantic.dark.accent).toBe(primitives.blue[400]);
    expect(semantic.light.surface).toBe(primitives.white);
  });

  it('every colour primitive is a valid hex', () => {
    const hex = /^#[0-9A-F]{6}$/i;
    for (const [k, v] of Object.entries(primitives.grey)) {
      expect(v, `grey.${k}`).toMatch(hex);
    }
  });

  it('light and dark expose identical semantic keys', () => {
    expect(Object.keys(semantic.light)).toEqual(Object.keys(semantic.dark));
  });

  it('z-index layers are strictly increasing', () => {
    const vals = Object.values(zIndex);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]!).toBeGreaterThan(vals[i - 1]!);
    }
  });

  it('bundles the token groups', () => {
    expect(tokens.radius).toBe(radius);
  });
});
