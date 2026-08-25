/** Organisation & integration enums (Phase 8). */

export enum ClientRelationshipStatus {
  /** Professional requested access; awaiting the client's consent. */
  PENDING = 'PENDING',
  /** Client accepted — professional has scoped read access. */
  ACTIVE = 'ACTIVE',
  /** Client declined the request. */
  DECLINED = 'DECLINED',
  /** Ended by the client, the professional, or an org admin. */
  REVOKED = 'REVOKED',
}

export enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

export enum WebhookStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum WebhookDeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  DEAD = 'DEAD',
}

/** Data-residency regions surfaced to org admins (PROJECT_MEMORY §2.3). */
export const DATA_REGIONS = ['af-south-1', 'eu-west-1'] as const;
export type DataRegion = (typeof DATA_REGIONS)[number];

/** Partner-API scopes (least privilege; keys carry an explicit subset). */
export const API_KEY_SCOPES = ['documents:read', 'usage:read', 'webhooks:manage'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
