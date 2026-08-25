import { retentionFor } from './retention';

describe('retentionFor', () => {
  const now = new Date('2026-07-16T00:00:00Z');

  it('returns undefined when Object Lock is disabled', () => {
    expect(retentionFor('NONE', 7, now)).toBeUndefined();
  });

  it('returns undefined when the retention window is zero', () => {
    expect(retentionFor('COMPLIANCE', 0, now)).toBeUndefined();
  });

  it('computes a COMPLIANCE retention window in years', () => {
    const spec = retentionFor('COMPLIANCE', 7, now);
    expect(spec?.mode).toBe('COMPLIANCE');
    // 7 * 365 days after now.
    const expected = new Date('2026-07-16T00:00:00Z').getTime() + 7 * 365 * 86_400_000;
    expect(spec?.retainUntil.getTime()).toBe(expected);
  });

  it('supports GOVERNANCE mode', () => {
    expect(retentionFor('GOVERNANCE', 1, now)?.mode).toBe('GOVERNANCE');
  });
});
