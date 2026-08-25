/**
 * Webhook retry policy (Phase 8): exponential backoff with a hard attempt cap.
 * Schedule (attempt → next delay): 1m, 5m, 30m, 2h, 6h, then DEAD. With the
 * default cap of 6 attempts a healthy endpoint receives its delivery well
 * within the 5-minute exit-criterion window on the first or second attempt.
 */
const BACKOFF_MS: readonly number[] = [
  60_000, // after attempt 1
  300_000, // after attempt 2
  1_800_000, // after attempt 3
  7_200_000, // after attempt 4
  21_600_000, // after attempt 5+
];

/** Delay before the next attempt, given how many attempts have failed so far. */
export function nextRetryDelayMs(failedAttempts: number): number {
  const idx = Math.min(Math.max(failedAttempts, 1), BACKOFF_MS.length) - 1;
  return BACKOFF_MS[idx] ?? BACKOFF_MS[BACKOFF_MS.length - 1] ?? 60_000;
}

/** True once a delivery has exhausted its attempt budget and must go DEAD. */
export function isDead(failedAttempts: number, maxAttempts: number): boolean {
  return failedAttempts >= maxAttempts;
}
