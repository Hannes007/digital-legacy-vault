import { BillingCurrency, BillingInterval, PlanTier, SubscriptionStatus } from '@dlv/shared-types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';

import {
  PAYMENT_GATEWAY,
  SUBSCRIPTION_REPOSITORY,
  type BillingWebhookEvent,
  type PaymentGateway,
  type SubscriptionRecord,
  type SubscriptionRepository,
} from './ports';

import type { Clock } from '../../../common/time/clock';

/** Dunning grace window before an account goes read-only (§9). */
const GRACE_DAYS = 14;
const MS_PER_DAY = 86_400_000;

/**
 * Applies provider (Stripe) billing webhooks to the local Subscription record
 * (Phase 6). Payment failure opens a 14-day grace window (read-only, never
 * deleted); a successful payment clears it. Every event is audited.
 */
@Injectable()
export class BillingWebhookService {
  private readonly logger = new Logger(BillingWebhookService.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async handle(payload: string, signature: string | null): Promise<{ received: true }> {
    const event = this.gateway.constructEvent(payload, signature);
    if (event.type === 'unknown') return { received: true };

    const existing = await this.resolveExisting(event);
    if (!existing && !event.userId) {
      this.logger.warn('Billing webhook without a resolvable user; ignoring.');
      return { received: true };
    }

    const base: SubscriptionRecord =
      existing ??
      ({
        id: uuidv7(),
        userId: event.userId as string,
        tier: PlanTier.FREE,
        status: SubscriptionStatus.INCOMPLETE,
        interval: BillingInterval.MONTH,
        currency: BillingCurrency.ZAR,
        seats: 1,
        stripeCustomerId: event.stripeCustomerId,
        stripeSubscriptionId: event.stripeSubscriptionId,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        graceUntil: null,
        createdAt: this.clock.now(),
        updatedAt: this.clock.now(),
      } as SubscriptionRecord);

    const next = this.apply(base, event);
    await this.subscriptions.upsert({
      id: base.id,
      userId: base.userId,
      tier: next.tier,
      status: next.status,
      interval: next.interval,
      currency: next.currency,
      seats: next.seats,
      stripeCustomerId: next.stripeCustomerId,
      stripeSubscriptionId: next.stripeSubscriptionId,
      currentPeriodEnd: next.currentPeriodEnd,
      cancelAtPeriodEnd: next.cancelAtPeriodEnd,
      graceUntil: next.graceUntil,
    });
    await this.audit.record({
      actorUserId: base.userId,
      eventType: `billing.${event.type}`,
      resource: `user:${base.userId}`,
      payload: { tier: next.tier, status: next.status },
    });
    return { received: true };
  }

  private async resolveExisting(event: BillingWebhookEvent): Promise<SubscriptionRecord | null> {
    if (event.userId) {
      const byUser = await this.subscriptions.findByUser(event.userId);
      if (byUser) return byUser;
    }
    if (event.stripeCustomerId) {
      return this.subscriptions.findByStripeCustomerId(event.stripeCustomerId);
    }
    return null;
  }

  private apply(base: SubscriptionRecord, event: BillingWebhookEvent): SubscriptionRecord {
    const now = this.clock.now();
    const merged: SubscriptionRecord = {
      ...base,
      stripeCustomerId: event.stripeCustomerId ?? base.stripeCustomerId,
      stripeSubscriptionId: event.stripeSubscriptionId ?? base.stripeSubscriptionId,
      currentPeriodEnd: event.currentPeriodEnd ?? base.currentPeriodEnd,
      cancelAtPeriodEnd: event.cancelAtPeriodEnd ?? base.cancelAtPeriodEnd,
    };
    switch (event.type) {
      case 'subscription.activated':
      case 'subscription.updated':
        return {
          ...merged,
          tier: event.tier ?? merged.tier,
          status: event.status ?? SubscriptionStatus.ACTIVE,
          graceUntil: null,
        };
      case 'payment.succeeded':
        return { ...merged, status: SubscriptionStatus.ACTIVE, graceUntil: null };
      case 'payment.failed':
        return {
          ...merged,
          status: SubscriptionStatus.GRACE,
          graceUntil: new Date(now.getTime() + GRACE_DAYS * MS_PER_DAY),
        };
      case 'subscription.canceled':
        return { ...merged, tier: PlanTier.FREE, status: SubscriptionStatus.CANCELED, cancelAtPeriodEnd: false };
      default:
        return merged;
    }
  }
}
