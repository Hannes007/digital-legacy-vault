import type { BillingCurrency, BillingInterval, PlanTier, SubscriptionStatus } from '@dlv/shared-types';

export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');
export const USAGE_REPOSITORY = Symbol('USAGE_REPOSITORY');
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface SubscriptionRecord {
  id: string;
  userId: string;
  tier: PlanTier;
  status: SubscriptionStatus;
  interval: BillingInterval;
  currency: BillingCurrency;
  seats: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertSubscriptionInput {
  id: string;
  userId: string;
  tier: PlanTier;
  status: SubscriptionStatus;
  interval: BillingInterval;
  currency: BillingCurrency;
  seats: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: Date | null;
}

export interface SubscriptionRepository {
  findByUser(userId: string): Promise<SubscriptionRecord | null>;
  findByStripeCustomerId(stripeCustomerId: string): Promise<SubscriptionRecord | null>;
  upsert(input: UpsertSubscriptionInput): Promise<SubscriptionRecord>;
}

/** Current usage counters for entitlement gating and display. */
export interface UsageSnapshot {
  documents: number;
  storageBytes: number;
  vaults: number;
  activeSecureLinks: number;
  signaturesThisMonth: number;
}

export interface UsageRepository {
  snapshot(userId: string, monthStart: Date): Promise<UsageSnapshot>;
  findUserEmail(userId: string): Promise<string | null>;
}

// --- Payment gateway (Stripe, dev fallback) ---------------------------------
export interface CheckoutParams {
  userId: string;
  email: string;
  tier: PlanTier;
  interval: BillingInterval;
  currency: BillingCurrency;
  successUrl: string;
  cancelUrl: string;
}
export interface PortalParams {
  customerId: string;
  returnUrl: string;
}
/** Normalised billing event derived from a provider webhook. */
export interface BillingWebhookEvent {
  type:
    | 'subscription.activated'
    | 'subscription.updated'
    | 'subscription.canceled'
    | 'payment.succeeded'
    | 'payment.failed'
    | 'unknown';
  userId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  tier: PlanTier | null;
  status: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean | null;
}
export interface PaymentGateway {
  createCheckoutSession(p: CheckoutParams): Promise<{ url: string; customerId: string | null }>;
  createBillingPortalSession(p: PortalParams): Promise<{ url: string }>;
  /** Verify + normalise a provider webhook. Throws on an invalid signature. */
  constructEvent(payload: string, signature: string | null): BillingWebhookEvent;
}
