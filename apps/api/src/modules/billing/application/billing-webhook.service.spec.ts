import { PlanTier, SubscriptionStatus } from '@dlv/shared-types';

import { BillingWebhookService } from './billing-webhook.service';

import type { BillingWebhookEvent, PaymentGateway, SubscriptionRecord, SubscriptionRepository } from './ports';
import type { Clock } from '../../../common/time/clock';
import type { AuditService } from '../../audit/audit.service';

const clock: Clock = { now: () => new Date('2026-07-16T10:00:00Z') };
const audit = { record: async () => undefined } as unknown as AuditService;

function gateway(event: BillingWebhookEvent): PaymentGateway {
  return {
    createCheckoutSession: async () => ({ url: 'x', customerId: null }),
    createBillingPortalSession: async () => ({ url: 'x' }),
    constructEvent: () => event,
  };
}
function capturingRepo(existing: SubscriptionRecord | null) {
  const state: { saved: SubscriptionRecord | null } = { saved: null };
  const repo: SubscriptionRepository = {
    findByUser: async () => existing,
    findByStripeCustomerId: async () => existing,
    upsert: async (i) => {
      state.saved = { ...i, createdAt: new Date(), updatedAt: new Date() };
      return state.saved;
    },
  };
  return { repo, state };
}
function evt(over: Partial<BillingWebhookEvent>): BillingWebhookEvent {
  return {
    type: 'subscription.activated', userId: 'u1', stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1',
    tier: PlanTier.PREMIUM, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: null, ...over,
  };
}

describe('BillingWebhookService', () => {
  it('activates a subscription to the paid tier', async () => {
    const { repo, state } = capturingRepo(null);
    const svc = new BillingWebhookService(repo, gateway(evt({ type: 'subscription.activated' })), clock, audit);
    await svc.handle('{}', 'sig');
    expect(state.saved?.tier).toBe(PlanTier.PREMIUM);
    expect(state.saved?.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('opens a 14-day grace window on payment failure (read-only, not deleted)', async () => {
    const existing: SubscriptionRecord = {
      id: 's1', userId: 'u1', tier: PlanTier.PREMIUM, status: SubscriptionStatus.ACTIVE, interval: 'MONTH' as never,
      currency: 'ZAR' as never, seats: 1, stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1',
      currentPeriodEnd: null, cancelAtPeriodEnd: false, graceUntil: null, createdAt: new Date(), updatedAt: new Date(),
    };
    const { repo, state } = capturingRepo(existing);
    const svc = new BillingWebhookService(repo, gateway(evt({ type: 'payment.failed' })), clock, audit);
    await svc.handle('{}', 'sig');
    expect(state.saved?.status).toBe(SubscriptionStatus.GRACE);
    expect(state.saved?.graceUntil?.toISOString()).toBe('2026-07-30T10:00:00.000Z');
  });

  it('cancels back to FREE', async () => {
    const { repo, state } = capturingRepo(null);
    const svc = new BillingWebhookService(repo, gateway(evt({ type: 'subscription.canceled' })), clock, audit);
    await svc.handle('{}', 'sig');
    expect(state.saved?.tier).toBe(PlanTier.FREE);
    expect(state.saved?.status).toBe(SubscriptionStatus.CANCELED);
  });
});
