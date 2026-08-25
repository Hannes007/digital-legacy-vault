/** Subscription plan tiers (Phase 6, PRD §pricing). */
export enum PlanTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  FAMILY = 'FAMILY',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

/** Billing cycle. */
export enum BillingInterval {
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

/** Supported billing currencies (ZAR primary). */
export enum BillingCurrency {
  ZAR = 'ZAR',
  USD = 'USD',
  EUR = 'EUR',
}

/** Subscription lifecycle. GRACE = in a dunning grace window (read-only). */
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  GRACE = 'GRACE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
}
