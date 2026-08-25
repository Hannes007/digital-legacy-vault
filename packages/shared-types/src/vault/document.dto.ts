import type { DocumentType } from '../common/document-type.js';
import type { DocumentStatus, ScanVerdict } from '../common/vault-enums.js';

export interface TagDto {
  id: string;
  label: string;
}

export interface DocumentCategoryDto {
  id: string;
  name: string;
  documentCount: number;
}

export interface DocumentDto {
  id: string;
  vaultId: string;
  ownerId: string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  categoryId: string | null;
  tags: string[];
  currentVersion: number;
  sizeBytes: number;
  mimeType: string;
  /** SHA-256 hex of the current version's plaintext (integrity anchor, §7.5). */
  sha256: string;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string;
}

export interface DocumentVersionDto {
  id: string;
  documentId: string;
  version: number;
  sizeBytes: number;
  sha256: string;
  mimeType: string;
  scanVerdict: ScanVerdict;
  createdAt: string;
}
