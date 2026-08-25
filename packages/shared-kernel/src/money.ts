/** Money as integer minor units + ISO 4217 currency (PROJECT_MEMORY §8). */
import { ValidationError } from './errors.js';
import { err, ok, type Result } from './result.js';

export interface Money {
  readonly amountMinor: number;
  readonly currency: string;
}

export function money(amountMinor: number, currency: string): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new ValidationError('amountMinor must be an integer number of minor units');
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new ValidationError('currency must be an ISO 4217 alpha-3 code');
  }
  return { amountMinor, currency };
}

/** Add two amounts; errors (not throws) on currency mismatch. */
export function addMoney(a: Money, b: Money): Result<Money, ValidationError> {
  if (a.currency !== b.currency) {
    return err(new ValidationError(`currency mismatch: ${a.currency} vs ${b.currency}`));
  }
  return ok(money(a.amountMinor + b.amountMinor, a.currency));
}

/** Human-readable formatting via Intl (minor → major units). */
export function formatMoney(value: Money, locale = 'en-ZA'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
  }).format(value.amountMinor / 100);
}
