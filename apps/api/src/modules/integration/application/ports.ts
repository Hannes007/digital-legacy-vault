import type {
  ApiKeyScope,
  ApiKeyStatus,
  WebhookDeliveryStatus,
  WebhookStatus,
} from '@dlv/shared-types';

export const API_KEY_REPOSITORY = Symbol('API_KEY_REPOSITORY');
export const WEBHOOK_REPOSITORY = Symbol('WEBHOOK_REPOSITORY');
export const WEBHOOK_DELIVERY_REPOSITORY = Symbol('WEBHOOK_DELIVERY_REPOSITORY');
export const WEBHOOK_TRANSPORT = Symbol('WEBHOOK_TRANSPORT');
export const PARTNER_DOCUMENT_PORT = Symbol('PARTNER_DOCUMENT_PORT');

// --- API keys -----------------------------------------------------------------
export interface ApiKeyRecord {
  id: string;
  ownerUserId: string;
  organisationId: string | null;
  name: string;
  prefix: string;
  keyHash: string;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}
export interface CreateApiKeyInput {
  id: string;
  ownerUserId: string;
  organisationId: string | null;
  name: string;
  prefix: string;
  keyHash: string;
  scopes: ApiKeyScope[];
  expiresAt: Date | null;
}
export interface ApiKeyRepository {
  create(input: CreateApiKeyInput): Promise<ApiKeyRecord>;
  findByHash(keyHash: string): Promise<ApiKeyRecord | null>;
  findById(id: string): Promise<ApiKeyRecord | null>;
  listByOwner(ownerUserId: string): Promise<ApiKeyRecord[]>;
  revoke(id: string): Promise<void>;
  touchLastUsed(id: string, at: Date): Promise<void>;
}

// --- Webhooks -------------------------------------------------------------------
export interface WebhookRecord {
  id: string;
  ownerUserId: string;
  organisationId: string | null;
  url: string;
  secretEnc: string;
  events: string[];
  status: WebhookStatus;
  createdAt: Date;
}
export interface CreateWebhookInput {
  id: string;
  ownerUserId: string;
  organisationId: string | null;
  url: string;
  secretEnc: string;
  events: string[];
}
export interface WebhookRepository {
  create(input: CreateWebhookInput): Promise<WebhookRecord>;
  findById(id: string): Promise<WebhookRecord | null>;
  listByOwner(ownerUserId: string): Promise<WebhookRecord[]>;
  /** ACTIVE webhooks owned by `ownerUserId` subscribed to `eventType`. */
  listActiveForEvent(ownerUserId: string, eventType: string): Promise<WebhookRecord[]>;
  disable(id: string): Promise<void>;
}

export interface WebhookDeliveryRecord {
  id: string;
  webhookId: string;
  eventType: string;
  payloadJson: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  nextAttemptAt: Date;
  responseStatus: number | null;
  lastError: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
}
export interface WebhookDeliveryRepository {
  create(input: {
    id: string;
    webhookId: string;
    eventType: string;
    payloadJson: string;
    nextAttemptAt: Date;
  }): Promise<WebhookDeliveryRecord>;
  /** PENDING/FAILED deliveries whose nextAttemptAt <= now (oldest first). */
  due(now: Date, limit: number): Promise<WebhookDeliveryRecord[]>;
  markDelivered(id: string, at: Date, responseStatus: number): Promise<void>;
  markFailed(
    id: string,
    attempts: number,
    nextAttemptAt: Date,
    dead: boolean,
    responseStatus: number | null,
    lastError: string,
  ): Promise<void>;
  listByWebhook(webhookId: string, limit: number): Promise<WebhookDeliveryRecord[]>;
}

/** Outbound HTTP seam so the delivery engine is unit-testable. */
export interface WebhookTransportResult {
  ok: boolean;
  status: number | null;
  error?: string;
}
export interface WebhookTransport {
  post(url: string, body: string, headers: Record<string, string>, timeoutMs: number): Promise<WebhookTransportResult>;
}

// --- Partner API read models ------------------------------------------------------
export interface PartnerDocumentSummary {
  id: string;
  title: string;
  type: string;
  status: string;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface PartnerDocumentPort {
  listByOwner(ownerUserId: string, limit: number): Promise<PartnerDocumentSummary[]>;
}
