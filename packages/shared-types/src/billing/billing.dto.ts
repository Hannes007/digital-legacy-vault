import type { BillingCurrency, BillingInterval, PlanTier, SubscriptionStatus } from '../common/billing-enums.js';

/** Resolved freemium entitlements for a tier. null = unlimited. */
export interface EntitlementsDto {
  tier: PlanTier;
  storageBytes: number;
  maxDocuments: number | null;
  maxVaults: number | null;
  activeSecureLinks: number | null;
  signaturesPerMonth: number | null;
  aiDocsPerMonth: number | null;
  familyMembers: number;
  /** True during a dunning grace window — writes are blocked until payment. */
  readOnly: boolean;
}

/** A plan in the catalogue (prices in minor units, VAT-inclusive). */
export interface PlanDto {
  tier: PlanTier;
  name: string;
  priceZarCents: number;
  priceUsdCents: number | null;
  priceEurCents: number | null;
  yearlyZarCents: number | null;
  entitlements: Omit<EntitlementsDto, 'readOnly'>;
}

/** The signed-in user's subscription. */
export interface SubscriptionDto {
  tier: PlanTier;
  status: SubscriptionStatus;
  interval: BillingInterval;
  currency: BillingCurrency;
  seats: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: string | null;
}

/** Current usage counters, paired with entitlements for display + gating. */
export interface UsageDto {
  documents: number;
  storageBytes: number;
  vaults: number;
  activeSecureLinks: number;
  signaturesThisMonth: number;
}

/** Start a checkout for a paid tier. */
export interface CreateCheckoutRequest {
  tier: PlanTier;
  interval?: BillingInterval;
  currency?: BillingCurrency;
}

/** A redirect URL to a hosted checkout / billing portal. */
export interface BillingRedirectDto {
  url: string;
}
