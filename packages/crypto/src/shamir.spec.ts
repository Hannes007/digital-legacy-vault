import { describe, expect, it } from 'vitest';
import { ShamirError, combineShares, splitSecret } from './shamir.js';

const secret = new Uint8Array([1, 2, 3, 250, 255, 0, 128, 42]);

describe('shamir', () => {
  it('reconstructs from exactly the threshold (3-of-5)', () => {
    const shares = splitSecret(secret, { shares: 5, threshold: 3 });
    expect(shares).toHaveLength(5);
    expect(combineShares([shares[0]!, shares[2]!, shares[4]!])).toEqual(secret);
  });

  it('reconstructs from any superset of the threshold', () => {
    const shares = splitSecret(secret, { shares: 5, threshold: 3 });
    expect(combineShares(shares)).toEqual(secret);
  });

  it('does not reveal the secret below threshold', () => {
    const shares = splitSecret(secret, { shares: 5, threshold: 3 });
    expect(combineShares([shares[0]!, shares[1]!])).not.toEqual(secret);
  });

  it('validates split parameters', () => {
    expect(() => splitSecret(secret, { shares: 5, threshold: 1.5 })).toThrow(/integers/);
    expect(() => splitSecret(secret, { shares: 3, threshold: 5 })).toThrow(/threshold <= shares/);
    expect(() => splitSecret(secret, { shares: 256, threshold: 2 })).toThrow(/255/);
    expect(() => splitSecret(new Uint8Array(0), { shares: 5, threshold: 3 })).toThrow(/non-empty/);
  });

  it('validates combine inputs', () => {
    const shares = splitSecret(secret, { shares: 5, threshold: 3 });
    expect(() => combineShares(['only-one'])).toThrow(/at least 2/);
    expect(() => combineShares([shares[0]!, shares[0]!])).toThrow(/duplicate/);
    // single-byte share => zero-length secret payload
    expect(() => combineShares([Buffer.from([1]).toString('base64'), Buffer.from([2]).toString('base64')])).toThrow(/malformed/);
    // inconsistent payload lengths
    const other = splitSecret(new Uint8Array([9, 9, 9, 9]), { shares: 5, threshold: 3 });
    expect(() => combineShares([shares[0]!, other[1]!, shares[2]!])).toThrow(/inconsistent/);
  });
});
