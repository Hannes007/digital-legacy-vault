/**
 * Cost-per-request instrumentation (Phase 7 exit criterion). Estimates are
 * deliberately simple and conservative: ~4 characters per token, and a small
 * per-model price table in micro-USD per 1K tokens. Every AI request records
 * its estimated cost in `ai_usage` so budgets are observable per user/feature.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

const CHARS_PER_TOKEN = 4;

export function estimateTokens(chars: number): number {
  return Math.ceil(Math.max(0, chars) / CHARS_PER_TOKEN);
}

interface ModelRate {
  /** micro-USD per 1K input tokens. */
  inPer1k: number;
  /** micro-USD per 1K output tokens. */
  outPer1k: number;
}

/** Fallback covers unknown models (priced at the highest table entry). */
const RATES: ReadonlyArray<[RegExp, ModelRate]> = [
  [/haiku/i, { inPer1k: 1_000, outPer1k: 5_000 }],
  [/sonnet/i, { inPer1k: 3_000, outPer1k: 15_000 }],
  [/opus|fable/i, { inPer1k: 15_000, outPer1k: 75_000 }],
  [/dev-heuristic|rules/i, { inPer1k: 0, outPer1k: 0 }],
];
const DEFAULT_RATE: ModelRate = { inPer1k: 15_000, outPer1k: 75_000 };

/** Estimated cost of one request in micro-USD (integer, never negative). */
export function estimateCostMicroUsd(model: string, usage: TokenUsage): number {
  const rate = RATES.find(([re]) => re.test(model))?.[1] ?? DEFAULT_RATE;
  const cost =
    (usage.inputTokens / 1_000) * rate.inPer1k + (usage.outputTokens / 1_000) * rate.outPer1k;
  return Math.max(0, Math.round(cost));
}
