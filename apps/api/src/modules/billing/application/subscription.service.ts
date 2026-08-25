import {
  BillingCurrency,
  BillingInterval,
  PlanTier,
  SubscriptionStatus,
  type BillingRedirectDto,
  type SubscriptionDto,
  type UsageDto,
} from '@dlv/shared-types';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK, ENV } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import { isSelfServeCheckoutTier } from '../domain/plan-catalog';

import { toSubscriptionDto } from './billing.mapper';
import {
  PAYMENT_GATEWAY,
  SUBSCRIPTION_REPOSITORY,
  USAGE_REPOSITORY,
  type PaymentGateway,
  type SubscriptionRecord,
  type SubscriptionRepository,
  type UsageRepository,
} from './ports';

import type { Clock } from '../../../common/time/clock';
import type { Env } from '@dlv/config';

/** Subscription lifecycle + checkout/portal orchestration (Phase 6). */
@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(USAGE_REPOSITORY) private readonly usage: UsageRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async get(userId: string): Promise<SubscriptionDto> {
    const sub = await this.subscriptions.findByUser(userId);
    if (sub) return toSubscriptionDto(sub);
    return {
      tier: PlanTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      interval: BillingInterval.MONTH,
      currency: BillingCurrency.ZAR,
      seats: 1,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      graceUntil: null,
    };
  }

  async usageSnapshot(userId: string): Promise<UsageDto> {
    const now = this.clock.now();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const snap = await this.usage.snapshot(userId, monthStart);
    return { ...snap };
  }

  async startCheckout(
    userId: string,
    input: { tier: PlanTier; interval?: BillingInterval; currency?: BillingCurrency },
  ): Promise<BillingRedirectDto> {
    if (!isSelfServeCheckoutTier(input.tier)) {
      throw new BadRequestException('That tier is not available for self-service checkout.');
    }
    const email = (await this.usage.findUserEmail(userId)) ?? '';
    const session = await this.gateway.createCheckoutSession({
      userId,
      email,
      tier: input.tier,
      interval: input.interval ?? BillingInterval.MONTH,
      currency: input.currency ?? BillingCurrency.ZAR,
      successUrl: this.env.BILLING_SUCCESS_URL,
      cancelUrl: this.env.BILLING_CANCEL_URL,
    });
    await this.audit.record({
      actorUserId: userId,
      eventType: 'billing.checkout.started',
      resource: `user:${userId}`,
      payload: { tier: input.tier, interval: input.interval ?? 'MONTH' },
    });
    return { url: session.url };
  }

  async openPortal(userId: string): Promise<BillingRedirectDto> {
    const sub = await this.subscriptions.findByUser(userId);
    if (!sub?.stripeCustomerId) {
      throw new NotFoundException('No billing account yet. Start a subscription first.');
    }
    const session = await this.gateway.createBillingPortalSession({
      customerId: sub.stripeCustomerId,
      returnUrl: this.env.BILLING_PORTAL_RETURN_URL,
    });
    return { url: session.url };
  }

  async cancel(userId: string): Promise<SubscriptionDto> {
    const sub = await this.subscriptions.findByUser(userId);
    if (!sub || sub.tier === PlanTier.FREE) {
      throw new ForbiddenException('There is no paid subscription to cancel.');
    }
    const updated = await this.persist({ ...sub, cancelAtPeriodEnd: true });
    await this.audit.record({
      actorUserId: userId,
      eventType: 'billing.subscription.cancel_requested',
      resource: `user:${userId}`,
      payload: { tier: sub.tier },
    });
    return toSubscriptionDto(updated);
  }

  private persist(s: SubscriptionRecord): Promise<SubscriptionRecord> {
    return this.subscriptions.upsert({
      id: s.id || uuidv7(),
      userId: s.userId,
      tier: s.tier,
      status: s.status,
      interval: s.interval,
      currency: s.currency,
      seats: s.seats,
      stripeCustomerId: s.stripeCustomerId,
      stripeSubscriptionId: s.stripeSubscriptionId,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      graceUntil: s.graceUntil,
    });
  }
}
