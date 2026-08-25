import { generateOpaqueToken } from '@dlv/crypto';
import { WEBHOOK_EVENT_TYPES, WebhookStatus } from '@dlv/shared-types';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';


import { CLOCK, FIELD_CIPHER } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';

import { WEBHOOK_DELIVERY_REPOSITORY, WEBHOOK_REPOSITORY } from './ports';

import type {
  WebhookDeliveryRecord,
  WebhookDeliveryRepository,
  WebhookRecord,
  WebhookRepository,
} from './ports';
import type { Clock } from '../../../common/time/clock';
import type { FieldCipher } from '@dlv/crypto';
import type {
  CreateWebhookRequest,
  CreatedWebhookDto,
  WebhookDeliveryDto,
  WebhookDto,
} from '@dlv/shared-types';

const MAX_WEBHOOKS_PER_OWNER = 20;

function toDto(record: WebhookRecord): WebhookDto {
  return {
    id: record.id,
    url: record.url,
    events: record.events,
    status: record.status,
    organisationId: record.organisationId,
    createdAt: record.createdAt.toISOString(),
  };
}

function deliveryDto(d: WebhookDeliveryRecord): WebhookDeliveryDto {
  return {
    id: d.id,
    webhookId: d.webhookId,
    eventType: d.eventType,
    status: d.status,
    attempts: d.attempts,
    nextAttemptAt: d.nextAttemptAt.toISOString(),
    responseStatus: d.responseStatus,
    lastError: d.lastError,
    deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
  };
}

/**
 * Webhook endpoint management (Phase 8). HTTPS-only destinations; the signing
 * secret is generated server-side, shown exactly once, and stored
 * field-encrypted (it must remain recoverable for signing). Fan-out to
 * deliveries happens in WebhookDispatchService.
 */
@Injectable()
export class WebhookService {
  constructor(
    @Inject(WEBHOOK_REPOSITORY) private readonly webhooks: WebhookRepository,
    @Inject(WEBHOOK_DELIVERY_REPOSITORY) private readonly deliveries: WebhookDeliveryRepository,
    @Inject(FIELD_CIPHER) private readonly cipher: FieldCipher,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async create(ownerUserId: string, input: CreateWebhookRequest): Promise<CreatedWebhookDto> {
    let url: URL;
    try {
      url = new URL(input.url);
    } catch {
      throw new BadRequestException('Enter a valid webhook URL.');
    }
    if (url.protocol !== 'https:') throw new BadRequestException('Webhook URLs must use HTTPS.');
    const events = [...new Set(input.events)];
    const known = new Set(WEBHOOK_EVENT_TYPES as readonly string[]);
    const invalid = events.filter((e) => !known.has(e));
    if (events.length === 0) throw new BadRequestException('Subscribe to at least one event.');
    if (invalid.length > 0) throw new BadRequestException(`Unknown events: ${invalid.join(', ')}`);
    if ((await this.webhooks.listByOwner(ownerUserId)).length >= MAX_WEBHOOKS_PER_OWNER) {
      throw new BadRequestException('Webhook limit reached.');
    }

    const secret = `whsec_${generateOpaqueToken()}`;
    const record = await this.webhooks.create({
      id: uuidv7(),
      ownerUserId,
      organisationId: input.organisationId ?? null,
      url: url.toString(),
      secretEnc: this.cipher.encrypt(secret),
      events,
    });
    await this.audit.record({
      actorUserId: ownerUserId,
      eventType: 'integration.webhook.created',
      resource: `webhook:${record.id}`,
      payload: { url: record.url, events },
    });
    return { ...toDto(record), secret };
  }

  async list(ownerUserId: string): Promise<WebhookDto[]> {
    return (await this.webhooks.listByOwner(ownerUserId)).map(toDto);
  }

  async disable(ownerUserId: string, id: string): Promise<void> {
    const record = await this.webhooks.findById(id);
    if (!record) throw new NotFoundException('Webhook not found.');
    if (record.ownerUserId !== ownerUserId) throw new ForbiddenException('Not your webhook.');
    if (record.status === WebhookStatus.DISABLED) return;
    await this.webhooks.disable(id);
    await this.audit.record({
      actorUserId: ownerUserId,
      eventType: 'integration.webhook.disabled',
      resource: `webhook:${id}`,
      payload: {},
    });
  }

  async recentDeliveries(ownerUserId: string, webhookId: string): Promise<WebhookDeliveryDto[]> {
    const record = await this.webhooks.findById(webhookId);
    if (!record) throw new NotFoundException('Webhook not found.');
    if (record.ownerUserId !== ownerUserId) throw new ForbiddenException('Not your webhook.');
    return (await this.deliveries.listByWebhook(webhookId, 50)).map(deliveryDto);
  }
}
