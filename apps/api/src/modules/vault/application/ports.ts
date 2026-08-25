import type { DocumentStatus, ScanVerdict } from '@dlv/shared-types';

// --- DI tokens ---------------------------------------------------------------
export const STORAGE_PORT = Symbol('STORAGE_PORT');
export const KMS_PORT = Symbol('KMS_PORT');
export const SCANNER_PORT = Symbol('SCANNER_PORT');
export const OCR_PORT = Symbol('OCR_PORT');
export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
export const DOCUMENT_VERSION_REPOSITORY = Symbol('DOCUMENT_VERSION_REPOSITORY');
export const VAULT_REPOSITORY = Symbol('VAULT_REPOSITORY');
export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');
export const TAG_REPOSITORY = Symbol('TAG_REPOSITORY');
export const DOCUMENT_SEARCH_PORT = Symbol('DOCUMENT_SEARCH_PORT');
export const CLIENT_VAULT_REPOSITORY = Symbol('CLIENT_VAULT_REPOSITORY');

// --- Storage (S3 multipart, quarantine + documents buckets) ------------------
export interface PartUrl {
  partNumber: number;
  url: string;
}
export interface CompletedPart {
  partNumber: number;
  etag: string;
}
/**
 * S3 Object Lock retention to apply to a promoted object (Phase 5 compliance).
 * COMPLIANCE mode cannot be shortened or removed by anyone (incl. root) until
 * `retainUntil`; GOVERNANCE can be overridden with a special permission.
 */
export interface RetentionSpec {
  mode: 'GOVERNANCE' | 'COMPLIANCE';
  retainUntil: Date;
}
export interface StoragePort {
  initQuarantineUpload(key: string, contentType: string, partCount: number): Promise<{ uploadId: string; parts: PartUrl[] }>;
  completeQuarantineUpload(key: string, uploadId: string, parts: CompletedPart[]): Promise<void>;
  readQuarantine(key: string): Promise<Uint8Array>;
  deleteQuarantine(key: string): Promise<void>;
  /** Writes the promoted object, optionally under an Object Lock retention. */
  putDocument(key: string, body: Uint8Array, retention?: RetentionSpec): Promise<void>;
  /** Applies (or extends) an Object Lock retention on an existing object. */
  applyRetention(key: string, retention: RetentionSpec): Promise<void>;
  presignDocumentDownload(key: string): Promise<string>;
}

// --- KMS (envelope key wrap/unwrap) -----------------------------------------
export interface KmsPort {
  wrapDek(dek: Uint8Array): Promise<string>;
  unwrapDek(wrapped: string): Promise<Uint8Array>;
}

// --- Antivirus + OCR ---------------------------------------------------------
export interface ScannerPort {
  scan(bytes: Uint8Array): Promise<ScanVerdict>;
}
export interface OcrPort {
  extractText(bytes: Uint8Array, mimeType: string): Promise<string | null>;
}

// --- Records -----------------------------------------------------------------
export interface DocumentRecord {
  id: string;
  vaultId: string;
  ownerId: string;
  title: string;
  type: string;
  status: DocumentStatus;
  categoryId: string | null;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface CreateDocumentInput {
  id: string;
  vaultId: string;
  ownerId: string;
  title: string;
  type: string;
}
export interface DocumentVersionRecord {
  id: string;
  documentId: string;
  version: number;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
  scanVerdict: ScanVerdict;
  storageKey: string;
  createdAt: Date;
}
export interface CreateVersionInput {
  id: string;
  documentId: string;
  version: number;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
  scanVerdict: ScanVerdict;
  storageKey: string;
  wrappedDek: string;
  contentIv: string;
  contentTag: string;
  ocrText: string | null;
}

export interface DocumentRepository {
  create(input: CreateDocumentInput): Promise<DocumentRecord>;
  findById(id: string): Promise<DocumentRecord | null>;
  listByOwner(ownerId: string): Promise<DocumentRecord[]>;
  updateStatus(id: string, status: DocumentStatus): Promise<void>;
  promote(id: string, version: number): Promise<void>;
  setCategory(id: string, categoryId: string | null): Promise<void>;
}
export interface DocumentVersionRepository {
  add(input: CreateVersionInput): Promise<DocumentVersionRecord>;
  listByDocument(documentId: string): Promise<DocumentVersionRecord[]>;
}
export interface VaultRecord {
  id: string;
  ownerId: string;
  kind: string;
  name: string;
}
export interface VaultRepository {
  ensureDefault(ownerId: string): Promise<VaultRecord>;
  findById(id: string): Promise<VaultRecord | null>;
}
export interface CategoryRecord {
  id: string;
  ownerId: string;
  name: string;
}
export interface CategoryRepository {
  create(input: { id: string; ownerId: string; name: string }): Promise<CategoryRecord>;
  listByOwner(ownerId: string): Promise<Array<CategoryRecord & { documentCount: number }>>;
}
export interface TagRepository {
  attach(input: { ownerId: string; documentId: string; label: string; tagId: string }): Promise<void>;
  listLabels(documentId: string): Promise<string[]>;
}
export interface SearchHit {
  documentId: string;
  title: string;
  type: string;
  snippet: string;
  rank: number;
}
export interface DocumentSearchPort {
  search(ownerId: string, query: string, limit: number): Promise<SearchHit[]>;
}
export interface ClientVaultRecord {
  id: string;
  ownerId: string;
  label: string;
  ciphertext: string;
  iv: string;
  createdAt: Date;
}
export interface ClientVaultRepository {
  create(input: { id: string; ownerId: string; label: string; ciphertext: string; iv: string }): Promise<ClientVaultRecord>;
  listByOwner(ownerId: string): Promise<ClientVaultRecord[]>;
  findById(id: string): Promise<ClientVaultRecord | null>;
  delete(id: string): Promise<void>;
}

// --- Pending-upload metadata (init → complete handoff) -----------------------
export const UPLOAD_METADATA_STORE = Symbol('UPLOAD_METADATA_STORE');
export interface PendingUpload {
  ownerId: string;
  quarantineKey: string;
  mimeType: string;
  sizeBytes: number;
}
export interface UploadMetadataStore {
  put(documentId: string, meta: PendingUpload, ttlSeconds: number): Promise<void>;
  take(documentId: string): Promise<PendingUpload | null>;
}
