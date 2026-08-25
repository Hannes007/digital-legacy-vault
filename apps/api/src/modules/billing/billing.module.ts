import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';

import { BillingWebhookService } from './application/billing-webhook.service';
import { EntitlementService } from './application/entitlement.service';
import { PlanService } from './application/plan.service';
import {
  PAYMENT_GATEWAY,
  SUBSCRIPTION_REPOSITORY,
  USAGE_REPOSITORY,
} from './application/ports';
import { SubscriptionService } from './application/subscription.service';
import { PrismaSubscriptionRepository } from './infrastructure/prisma-subscription.repository';
import { PrismaUsageRepository } from './infrastructure/prisma-usage.repository';
import { StripePaymentGateway } from './infrastructure/stripe-payment.gateway';
import { BillingWebhookController } from './presentation/billing-webhook.controller';
import { BillingController } from './presentation/billing.controller';

/**
 * Billing bounded context (Phase 6). Plan catalogue + Subscriptions, Stripe
 * checkout/portal/webhooks (dev fallback), and freemium entitlement enforcement.
 * Exports EntitlementService so feature contexts can gate on plan limits.
 */
@Module({
  imports: [AuditModule, IdentityModule],
  controllers: [BillingController, BillingWebhookController],
  providers: [
    PlanService,
    SubscriptionService,
    EntitlementService,
    BillingWebhookService,
    { provide: SUBSCRIPTION_REPOSITORY, useClass: PrismaSubscriptionRepository },
    { provide: USAGE_REPOSITORY, useClass: PrismaUsageRepository },
    { provide: PAYMENT_GATEWAY, useClass: StripePaymentGateway },
  ],
  exports: [EntitlementService],
})
export class BillingModule {}
