import { WebhookDeliveryStatus, WebhookStatus } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type {
  ApiKeyRecord,
  ApiKeyRepository,
  CreateApiKeyInput,
  CreateWebhookInput,
  PartnerDocumentPort,
  PartnerDocumentSummary,
  WebhookDeliveryRecord,
  WebhookDeliveryRepository,
  WebhookRecord,
  WebhookRepository,
} from '../application/ports';

@Injectable()
export class PrismaApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateApiKeyInput): Promise<ApiKeyRecord> {
    return (await this.prisma.apiKey.create({ data: input })) as ApiKeyRecord;
  }
  async findByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    return (await this.prisma.apiKey.findUnique({ where: { keyHash } })) as ApiKeyRecord | null;
  }
  async findById(id: string): Promise<ApiKeyRecord | null> {
    return (await this.prisma.apiKey.findUnique({ where: { id } })) as ApiKeyRecord | null;
  }
  async listByOwner(ownerUserId: string): Promise<ApiKeyRecord[]> {
    return (await this.prisma.apiKey.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: 'desc' },
    })) as ApiKeyRecord[];
  }
  async revoke(id: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { status: 'REVOKED' } });
  }
  async touchLastUsed(id: string, at: Date): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { lastUsedAt: at } });
  }
}

@Injectable()
export class PrismaWebhookRepository implements WebhookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWebhookInput): Promise<WebhookRecord> {
    return (await this.prisma.webhook.create({ data: input })) as WebhookRecord;
  }
  async findById(id: string): Promise<WebhookRecord | null> {
    return (await this.prisma.webhook.findUnique({ where: { id } })) as WebhookRecord | null;
  }
  async listByOwner(ownerUserId: string): Promise<WebhookRecord[]> {
    return (await this.prisma.webhook.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: 'desc' },
    })) as WebhookRecord[];
  }
  async listActiveForEvent(ownerUserId: string, eventType: string): Promise<WebhookRecord[]> {
    return (await this.prisma.webhook.findMany({
      where: { ownerUserId, status: WebhookStatus.ACTIVE, events: { has: eventType } },
    })) as WebhookRecord[];
  }
  async disable(id: string): Promise<void> {
    await this.prisma.webhook.update({ where: { id }, data: { status: WebhookStatus.DISABLED } });
  }
}

@Injectable()
export class PrismaWebhookDeliveryRepository implements WebhookDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    id: string;
    webhookId: string;
    eventType: string;
    payloadJson: string;
    nextAttemptAt: Date;
  }): Promise<WebhookDeliveryRecord> {
    return (await this.prisma.webhookDelivery.create({ data: input })) as WebhookDeliveryRecord;
  }

  async due(now: Date, limit: number): Promise<WebhookDeliveryRecord[]> {
    return (await this.prisma.webhookDelivery.findMany({
      where: {
        status: { in: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.FAILED] },
        nextAttemptAt: { lte: now },
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
    })) as WebhookDeliveryRecord[];
  }

  async markDelivered(id: string, at: Date, responseStatus: number): Promise<void> {
    await this.prisma.webhookDelivery.update({
      where: { id },
      data: { status: WebhookDeliveryStatus.DELIVERED, deliveredAt: at, responseStatus },
    });
  }

  async markFailed(
    id: string,
    attempts: number,
    nextAttemptAt: Date,
    dead: boolean,
    responseStatus: number | null,
    lastError: string,
  ): Promise<void> {
    await this.prisma.webhookDelivery.update({
      where: { id },
      data: {
        status: dead ? WebhookDeliveryStatus.DEAD : WebhookDeliveryStatus.FAILED,
        attempts,
        nextAttemptAt,
        responseStatus,
        lastError,
      },
    });
  }

  async listByWebhook(webhookId: string, limit: number): Promise<WebhookDeliveryRecord[]> {
    return (await this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })) as WebhookDeliveryRecord[];
  }
}

/** Partner-API document read model (metadata only — never content). */
@Injectable()
export class PrismaPartnerDocumentAdapter implements PartnerDocumentPort {
  constructor(private readonly prisma: PrismaService) {}

  async listByOwner(ownerUserId: string, limit: number): Promise<PartnerDocumentSummary[]> {
    return (await this.prisma.document.findMany({
      where: { ownerId: ownerUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        currentVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as PartnerDocumentSummary[];
  }
}
