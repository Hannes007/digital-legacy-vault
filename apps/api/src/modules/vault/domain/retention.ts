import type { RetentionSpec } from '../application/ports';

/** Days in a (non-leap) year — retention windows are coarse by design. */
const DAYS_PER_YEAR = 365;
const MS_PER_DAY = 86_400_000;

/**
 * Builds an S3 Object Lock {@link RetentionSpec} from the configured mode and a
 * retention window in years, or `undefined` when locking is disabled
 * (`NONE`) or the window is zero. Keeping this pure makes it unit-testable
 * without S3 (Phase 5 compliance).
 */
export function retentionFor(
  mode: 'NONE' | 'GOVERNANCE' | 'COMPLIANCE',
  years: number,
  now: Date,
): RetentionSpec | undefined {
  if (mode === 'NONE' || years <= 0) return undefined;
  const retainUntil = new Date(now.getTime() + years * DAYS_PER_YEAR * MS_PER_DAY);
  return { mode, retainUntil };
}
