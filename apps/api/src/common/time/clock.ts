/**
 * Clock abstraction — every service reads "now" through this port so tests can
 * freeze time and audit timestamps stay deterministic under test.
 */
export interface Clock {
  /** Current instant. */
  now(): Date;
}

/** Production clock backed by the system wall clock. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
