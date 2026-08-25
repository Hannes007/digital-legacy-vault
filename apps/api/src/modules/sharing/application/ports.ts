import type { AccessRequestStatus, SharePermission, ShareStatus } from '@dlv/shared-types';

export const SHARE_REPOSITORY = Symbol('SHARE_REPOSITORY');
export const SECURE_LINK_REPOSITORY = Symbol('SECURE_LINK_REPOSITORY');
export const ACCESS_REQUEST_REPOSITORY = Symbol('ACCESS_REQUEST_REPOSITORY');

export interface ShareRecord {
  id: string;
  documentId: string;
  ownerId: string;
  recipientEmail: string;
  permission: SharePermission;
  status: ShareStatus;
  expiresAt: Date | null;
  createdAt: Date;
}
export interface CreateShareInput {
  id: string;
  documentId: string;
  ownerId: string;
  recipientEmail: string;
  permission: SharePermission;
  expiresAt: Date | null;
}
export interface ShareRepository {
  create(input: CreateShareInput): Promise<ShareRecord>;
  findById(id: string): Promise<ShareRecord | null>;
  listByOwner(ownerId: string): Promise<ShareRecord[]>;
  revoke(id: string, at: Date): Promise<void>;
}

export interface SecureLinkRecord {
  id: string;
  documentId: string;
  ownerId: string;
  permission: SharePermission;
  status: ShareStatus;
  maxViews: number | null;
  viewCount: number;
  expiresAt: Date;
  createdAt: Date;
}
export interface CreateSecureLinkInput {
  id: string;
  documentId: string;
  ownerId: string;
  tokenHash: string;
  permission: SharePermission;
  maxViews: number | null;
  expiresAt: Date;
}
export interface SecureLinkRepository {
  create(input: CreateSecureLinkInput): Promise<SecureLinkRecord>;
  findByTokenHash(tokenHash: string): Promise<SecureLinkRecord | null>;
  listByOwner(ownerId: string): Promise<SecureLinkRecord[]>;
  incrementViews(id: string): Promise<void>;
  revoke(id: string, at: Date): Promise<void>;
}

export interface AccessRequestRecord {
  id: string;
  documentId: string;
  ownerId: string;
  requesterId: string;
  message: string | null;
  status: AccessRequestStatus;
  createdAt: Date;
}
export interface AccessRequestRepository {
  create(input: { id: string; documentId: string; ownerId: string; requesterId: string; message: string | null }): Promise<AccessRequestRecord>;
  findById(id: string): Promise<AccessRequestRecord | null>;
  listForOwner(ownerId: string): Promise<AccessRequestRecord[]>;
  setStatus(id: string, status: AccessRequestStatus, at: Date): Promise<void>;
}
