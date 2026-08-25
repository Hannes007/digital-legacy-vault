import type {
  ApiKeyScope,
  ApiKeyStatus,
  WebhookDeliveryStatus,
  WebhookStatus,
} from '../common/organisation-enums.js';

export interface ApiKeyDto {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  organisationId: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
  organisationId?: string;
  expiresAt?: string;
}

/** Returned exactly once at creation — the secret is never shown again. */
export interface CreatedApiKeyDto extends ApiKeyDto {
  apiKey: string;
}

export interface WebhookDto {
  id: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  organisationId: string | null;
  createdAt: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  organisationId?: string;
}

/** Returned exactly once at creation — used to verify delivery signatures. */
export interface CreatedWebhookDto extends WebhookDto {
  secret: string;
}

export interface WebhookDeliveryDto {
  id: string;
  webhookId: string;
  eventType: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  nextAttemptAt: string;
  responseStatus: number | null;
  lastError: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

/** Canonical outbound webhook event types (partner contract v1). */
export const WEBHOOK_EVENT_TYPES = [
  'document.ready',
  'document.infected',
  'signature.sealed',
  'emergency_access.requested',
  'emergency_access.activated',
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];
