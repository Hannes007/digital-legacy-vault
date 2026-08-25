import { estimateCostMicroUsd, estimateTokens } from './cost';

describe('cost instrumentation (Phase 7 exit: budgets)', () => {
  it('estimates ~4 chars per token, never negative', () => {
    expect(estimateTokens(8)).toBe(2);
    expect(estimateTokens(9)).toBe(3);
    expect(estimateTokens(-5)).toBe(0);
  });

  it('prices haiku-class models and zero-rates the dev fallback', () => {
    expect(estimateCostMicroUsd('claude-haiku-4-5', { inputTokens: 1000, outputTokens: 1000 })).toBe(6_000);
    expect(estimateCostMicroUsd('dev-heuristic', { inputTokens: 1000, outputTokens: 1000 })).toBe(0);
    expect(estimateCostMicroUsd('rules/completeness-v1', { inputTokens: 0, outputTokens: 0 })).toBe(0);
  });

  it('prices unknown models at the most expensive rate (conservative)', () => {
    const unknown = estimateCostMicroUsd('mystery-model', { inputTokens: 1000, outputTokens: 0 });
    expect(unknown).toBe(15_000);
  });
});
