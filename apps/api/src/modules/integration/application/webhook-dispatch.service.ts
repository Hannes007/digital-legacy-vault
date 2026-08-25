import { Inject, Injectable, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK, ENV, FIELD_CIPHER } from '../../../common/tokens';
import { isDead, nextRetryDelayMs } from '../domain/retry-policy';
import { signWebhookPayload } from '../domain/webhook-signature';

import {
  WEBHOOK_DELIVERY_REPOSITORY,
  WEBHOOK_REPOSITORY,
  WEBHOOK_TRANSPORT,
} from './ports';

import type {
  WebhookDeliveryRepository,
  WebhookRepository,
  WebhookTransport,
} from './ports';
import type { Clock } from '../../../common/time/clock';
import type { Env } from '@dlv/config';
import type { FieldCipher } from '@dlv/crypto';
import type { WebhookEventType } from '@dlv/shared-types';

const BATCH_SIZE = 50;

/**
 * Webhook fan-out + delivery engine (Phase 8). `dispatch` records one PENDING
 * delivery per subscribed ACTIVE endpoint (due immediately); `processDue` is
 * the worker-polled pump: it signs each payload (HMAC-SHA256 with timestamp),
 * POSTs with a timeout, and retries with exponential backoff until DELIVERED
 * or DEAD (attempt cap from config). Exit criterion (≥99.9% within 5 min in a
 * soak test) is measured against this engine in a live environment.
 */
@Injectable()
export class WebhookDispatchService {
  private readonly logger = new Logger(WebhookDispatchService.name);

  constructor(
    @Inject(WEBHOOK_REPOSITORY) private readonly webhooks: WebhookRepository,
    @Inject(WEBHOOK_DELIVERY_REPOSITORY) private readonly deliveries: WebhookDeliveryRepository,
    @Inject(WEBHOOK_TRANSPORT) private readonly transport: WebhookTransport,
    @Inject(FIELD_CIPHER) private readonly cipher: FieldCipher,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Fans an event out to every subscribed ACTIVE endpoint of the owner. */
  async dispatch(
    ownerUserId: string,
    eventType: WebhookEventType,
    payload: Record<string, unknown>,
  ): Promise<number> {
    const targets = await this.webhooks.listActiveForEvent(ownerUserId, eventType);
    if (targets.length === 0) return 0;
    const now = this.clock.now();
    const body = JSON.stringify({
      id: uuidv7(),
      type: eventType,
      createdAt: now.toISOString(),
      data: payload,
    });
    await Promise.all(
      targets.map((t) =>
        this.deliveries.create({
          id: uuidv7(),
          webhookId: t.id,
          eventType,
          payloadJson: body,
          nextAttemptAt: now,
        }),
      ),
    );
    return targets.length;
  }

  /** Worker pump: attempts every due delivery once. Returns processed count. */
  async processDue(): Promise<number> {
    const now = this.clock.now();
    const due = await this.deliveries.due(now, BATCH_SIZE);
    for (const delivery of due) {
      const webhook = await this.webhooks.findById(delivery.webhookId);
      if (!webhook || webhook.status !== 'ACTIVE') {
        await this.deliveries.markFailed(
          delivery.id,
          delivery.attempts + 1,
          now,
          true,
          null,
          'Webhook removed or disabled.',
        );
        continue;
      }

      const timestamp = Math.floor(now.getTime() / 1000);
      const signature = signWebhookPayload(
        this.cipher.decrypt(webhook.secretEnc),
        timestamp,
        delivery.payloadJson,
      );
      const result = await this.transport.post(
        webhook.url,
        delivery.payloadJson,
        {
          'content-type': 'application/json',
          'x-dlv-signature': signature,
          'x-dlv-event': delivery.eventType,
          'x-dlv-delivery': delivery.id,
        },
        this.env.WEBHOOK_TIMEOUT_MS,
      );

      if (result.ok) {
        await this.deliveries.markDelivered(delivery.id, now, result.status ?? 200);
      } else {
        const attempts = delivery.attempts + 1;
        const dead = isDead(attempts, this.env.WEBHOOK_MAX_ATTEMPTS);
        const nextAt = new Date(now.getTime() + nextRetryDelayMs(attempts));
        await this.deliveries.markFailed(
          delivery.id,
          attempts,
          nextAt,
          dead,
          result.status,
          result.error ?? `HTTP ${String(result.status ?? 0)}`,
        );
        if (dead) {
          this.logger.warn(`Webhook delivery ${delivery.id} is DEAD after ${String(attempts)} attempts.`);
        }
      }
    }
    return due.length;
  }
}
