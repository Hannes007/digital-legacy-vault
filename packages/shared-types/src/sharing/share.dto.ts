import type { SharePermission, ShareStatus } from '../common/sharing-enums.js';

export interface DocumentShareDto {
  id: string;
  documentId: string;
  ownerId: string;
  recipientEmail: string;
  permission: SharePermission;
  status: ShareStatus;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateShareRequest {
  documentId: string;
  recipientEmail: string;
  permission?: SharePermission;
  /** Days until the share expires (optional; no expiry when omitted). */
  expiresInDays?: number;
}

export interface SecureLinkDto {
  id: string;
  documentId: string;
  permission: SharePermission;
  status: ShareStatus;
  maxViews: number | null;
  viewCount: number;
  expiresAt: string;
  createdAt: string;
  /** Full shareable URL — returned ONCE at creation (embeds the raw token). */
  url?: string;
}

export interface CreateSecureLinkRequest {
  documentId: string;
  permission?: SharePermission;
  /** Days until expiry; default 7, max 90 (PROJECT_MEMORY §9). */
  expiresInDays?: number;
  maxViews?: number;
}

export interface AccessRequestDto {
  id: string;
  documentId: string;
  ownerId: string;
  requesterId: string;
  message: string | null;
  status: AccessRequestStatusLike;
  createdAt: string;
}
type AccessRequestStatusLike = 'PENDING' | 'APPROVED' | 'DENIED';
