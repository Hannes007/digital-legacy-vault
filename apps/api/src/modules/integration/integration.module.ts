import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';

import { ApiKeyService } from './application/api-key.service';
import {
  API_KEY_REPOSITORY,
  PARTNER_DOCUMENT_PORT,
  WEBHOOK_DELIVERY_REPOSITORY,
  WEBHOOK_REPOSITORY,
  WEBHOOK_TRANSPORT,
} from './application/ports';
import { WebhookDispatchService } from './application/webhook-dispatch.service';
import { WebhookService } from './application/webhook.service';
import { FetchWebhookTransport } from './infrastructure/fetch-webhook.transport';
import {
  PrismaApiKeyRepository,
  PrismaPartnerDocumentAdapter,
  PrismaWebhookDeliveryRepository,
  PrismaWebhookRepository,
} from './infrastructure/prisma-integration.repositories';
import { ApiKeyGuard } from './presentation/api-key.guard';
import { IntegrationController } from './presentation/integration.controller';
import { PartnerController } from './presentation/partner.controller';
import { PartnerScopeGuard } from './presentation/scopes.decorator';

/**
 * Integration bounded context (Phase 8): hashed+scoped API keys, the scoped
 * partner API, and outbound webhooks with HMAC-signed deliveries and
 * exponential-backoff retries. Exports WebhookDispatchService so other
 * contexts can emit partner events, and the delivery pump for the worker.
 */
@Module({
  imports: [AuditModule, IdentityModule],
  controllers: [IntegrationController, PartnerController],
  providers: [
    ApiKeyService,
    WebhookService,
    WebhookDispatchService,
    ApiKeyGuard,
    PartnerScopeGuard,
    { provide: API_KEY_REPOSITORY, useClass: PrismaApiKeyRepository },
    { provide: WEBHOOK_REPOSITORY, useClass: PrismaWebhookRepository },
    { provide: WEBHOOK_DELIVERY_REPOSITORY, useClass: PrismaWebhookDeliveryRepository },
    { provide: WEBHOOK_TRANSPORT, useClass: FetchWebhookTransport },
    { provide: PARTNER_DOCUMENT_PORT, useClass: PrismaPartnerDocumentAdapter },
  ],
  exports: [WebhookDispatchService],
})
export class IntegrationModule {}
