import { isDead, nextRetryDelayMs } from './retry-policy';

describe('webhook retry policy (Phase 8)', () => {
  it('backs off exponentially: 1m, 5m, 30m, 2h, 6h (capped)', () => {
    expect(nextRetryDelayMs(1)).toBe(60_000);
    expect(nextRetryDelayMs(2)).toBe(300_000);
    expect(nextRetryDelayMs(3)).toBe(1_800_000);
    expect(nextRetryDelayMs(4)).toBe(7_200_000);
    expect(nextRetryDelayMs(5)).toBe(21_600_000);
    expect(nextRetryDelayMs(99)).toBe(21_600_000);
  });

  it('marks a delivery dead only at the attempt cap', () => {
    expect(isDead(5, 6)).toBe(false);
    expect(isDead(6, 6)).toBe(true);
  });
});
