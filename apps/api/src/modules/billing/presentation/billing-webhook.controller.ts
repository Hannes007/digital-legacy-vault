import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { BillingWebhookService } from '../application/billing-webhook.service';

/**
 * Public provider webhook (Phase 6). No JWT — authenticity comes from the Stripe
 * signature (verified in the gateway when STRIPE_WEBHOOK_SECRET is set). In
 * production the route must receive the raw request body for signature checks;
 * that is wired at the HTTP layer (documented in the billing runbook).
 */
@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly webhook: BillingWebhookService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handle(
    @Body() body: unknown,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: true }> {
    return this.webhook.handle(JSON.stringify(body ?? {}), signature ?? null);
  }
}
