import { createHmac, timingSafeEqual } from 'node:crypto';

import { BillingCurrency, BillingInterval, PlanTier, SubscriptionStatus } from '@dlv/shared-types';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';

import { ENV } from '../../../common/tokens';
import { PLAN_CATALOG } from '../domain/plan-catalog';

import type {
  BillingWebhookEvent,
  CheckoutParams,
  PaymentGateway,
  PortalParams,
} from '../application/ports';
import type { Env } from '@dlv/config';

const STRIPE_API = 'https://api.stripe.com/v1';

/**
 * Stripe payment gateway (Phase 6). Uses the Stripe REST API over fetch when
 * `STRIPE_SECRET_KEY` is set — no SDK dependency — and verifies webhooks with
 * the standard HMAC signature scheme. When unset it falls back to an offline dev
 * gateway (mirrors the TSA/KMS dev-fallback pattern): checkout/portal resolve to
 * app URLs and `constructEvent` parses a normalised JSON body directly.
 */
@Injectable()
export class StripePaymentGateway implements PaymentGateway {
  private readonly logger = new Logger(StripePaymentGateway.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  private get live(): boolean {
    return this.env.STRIPE_SECRET_KEY.length > 0;
  }

  private unitAmount(tier: PlanTier, interval: BillingInterval): number {
    const plan = PLAN_CATALOG.find((p) => p.tier === tier);
    if (!plan) throw new BadRequestException('Unknown plan tier.');
    return interval === BillingInterval.YEAR ? plan.yearlyZarCents ?? plan.priceZarCents * 12 : plan.priceZarCents;
  }

  async createCheckoutSession(p: CheckoutParams): Promise<{ url: string; customerId: string | null }> {
    if (!this.live) {
      return { url: p.successUrl, customerId: `cus_dev_${p.userId}` };
    }
    const plan = PLAN_CATALOG.find((x) => x.tier === p.tier);
    const body = new URLSearchParams();
    body.set('mode', 'subscription');
    body.set('success_url', p.successUrl);
    body.set('cancel_url', p.cancelUrl);
    if (p.email) body.set('customer_email', p.email);
    body.set('client_reference_id', p.userId);
    body.set('metadata[userId]', p.userId);
    body.set('metadata[tier]', p.tier);
    body.set('subscription_data[metadata][userId]', p.userId);
    body.set('subscription_data[metadata][tier]', p.tier);
    body.set('line_items[0][quantity]', '1');
    body.set('line_items[0][price_data][currency]', p.currency.toLowerCase());
    body.set('line_items[0][price_data][unit_amount]', String(this.unitAmount(p.tier, p.interval)));
    body.set('line_items[0][price_data][recurring][interval]', p.interval === BillingInterval.YEAR ? 'year' : 'month');
    body.set('line_items[0][price_data][product_data][name]', `DLV ${plan?.name ?? p.tier}`);

    const res = await this.stripe('/checkout/sessions', body);
    return { url: String(res.url), customerId: res.customer ? String(res.customer) : null };
  }

  async createBillingPortalSession(p: PortalParams): Promise<{ url: string }> {
    if (!this.live) return { url: p.returnUrl };
    const body = new URLSearchParams();
    body.set('customer', p.customerId);
    body.set('return_url', p.returnUrl);
    const res = await this.stripe('/billing_portal/sessions', body);
    return { url: String(res.url) };
  }

  constructEvent(payload: string, signature: string | null): BillingWebhookEvent {
    if (this.env.STRIPE_WEBHOOK_SECRET.length > 0) {
      this.verifySignature(payload, signature);
    }
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    // Pass-through for our normalised dev events.
    const devTypes = new Set([
      'subscription.activated', 'subscription.updated', 'subscription.canceled', 'payment.succeeded', 'payment.failed',
    ]);
    if (typeof parsed.type === 'string' && devTypes.has(parsed.type)) {
      return this.normaliseDev(parsed);
    }
    return this.normaliseStripe(parsed);
  }

  private verifySignature(payload: string, signature: string | null): void {
    if (!signature) throw new BadRequestException('Missing Stripe signature.');
    const parts = Object.fromEntries(signature.split(',').map((kv) => kv.split('=') as [string, string]));
    const t = parts['t'];
    const v1 = parts['v1'];
    if (!t || !v1) throw new BadRequestException('Malformed Stripe signature.');
    const expected = createHmac('sha256', this.env.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(v1);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestException('Invalid Stripe signature.');
    }
  }

  private normaliseDev(p: Record<string, unknown>): BillingWebhookEvent {
    const cpe = p.currentPeriodEnd;
    return {
      type: p.type as BillingWebhookEvent['type'],
      userId: (p.userId as string) ?? null,
      stripeCustomerId: (p.stripeCustomerId as string) ?? null,
      stripeSubscriptionId: (p.stripeSubscriptionId as string) ?? null,
      tier: (p.tier as PlanTier) ?? null,
      status: (p.status as SubscriptionStatus) ?? null,
      currentPeriodEnd: typeof cpe === 'string' ? new Date(cpe) : null,
      cancelAtPeriodEnd: typeof p.cancelAtPeriodEnd === 'boolean' ? p.cancelAtPeriodEnd : null,
    };
  }

  private normaliseStripe(p: Record<string, unknown>): BillingWebhookEvent {
    const data = ((p.data as Record<string, unknown>)?.object ?? {}) as Record<string, unknown>;
    const meta = (data.metadata ?? {}) as Record<string, string>;
    const map: Record<string, BillingWebhookEvent['type']> = {
      'customer.subscription.created': 'subscription.activated',
      'customer.subscription.updated': 'subscription.updated',
      'customer.subscription.deleted': 'subscription.canceled',
      'invoice.payment_succeeded': 'payment.succeeded',
      'invoice.payment_failed': 'payment.failed',
    };
    const type = map[String(p.type)] ?? 'unknown';
    const periodEnd = data.current_period_end;
    const tier = meta.tier && Object.values(PlanTier).includes(meta.tier as PlanTier) ? (meta.tier as PlanTier) : null;
    return {
      type,
      userId: meta.userId ?? null,
      stripeCustomerId: data.customer ? String(data.customer) : null,
      stripeSubscriptionId: data.id ? String(data.id) : (data.subscription ? String(data.subscription) : null),
      tier,
      status: null,
      currentPeriodEnd: typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: typeof data.cancel_at_period_end === 'boolean' ? data.cancel_at_period_end : null,
    };
  }

  private async stripe(path: string, body: URLSearchParams): Promise<Record<string, unknown>> {
    const res = await fetch(`${STRIPE_API}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!res.ok) {
      this.logger.error(`Stripe ${path} failed: ${String(res.status)}`);
      throw new BadRequestException('Payment provider request failed.');
    }
    return (await res.json()) as Record<string, unknown>;
  }
}
