import { ValidationError } from './errors.js';

/** Narrowing helper: value is neither null nor undefined. */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Assert a condition, throwing a ValidationError when it fails. */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ValidationError(message);
  }
}

/** Assert a value is present, returning it narrowed. */
export function assertDefined<T>(value: T | null | undefined, message: string): T {
  if (!isDefined(value)) {
    throw new ValidationError(message);
  }
  return value;
}
