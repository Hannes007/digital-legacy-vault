import { Inject, Injectable, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { encryptContent, generateDek, sha256Hex } from '@dlv/crypto';
import { DocumentStatus, ScanVerdict } from '@dlv/shared-types';

import { AuditService } from '../../audit/audit.service';
import { ENV } from '../../../common/tokens';
import { magicBytesMatch } from '../domain/magic-bytes';
import { retentionFor } from '../domain/retention';
import {
  DOCUMENT_REPOSITORY,
  DOCUMENT_VERSION_REPOSITORY,
  KMS_PORT,
  OCR_PORT,
  SCANNER_PORT,
  STORAGE_PORT,
  type DocumentRepository,
  type DocumentVersionRepository,
  type KmsPort,
  type OcrPort,
  type ScannerPort,
  type StoragePort,
} from './ports';

import type { Env } from '@dlv/config';

export interface PromoteInput {
  documentId: string;
  ownerId: string;
  quarantineKey: string;
  mimeType: string;
}
export interface PromoteResult {
  status: DocumentStatus;
  version?: number;
  sha256?: string;
}

/**
 * The upload pipeline (security invariant §7.5):
 *   quarantine → ClamAV scan → magic-byte validation → SHA-256 → envelope
 *   encrypt (per-doc DEK, KMS-wrapped) → promote → new DocumentVersion.
 *
 * Every terminal outcome writes an audit event; infected/invalid objects are
 * deleted from quarantine and never promoted. Designed to run in the worker;
 * invoked here synchronously for the vertical slice.
 */
@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(SCANNER_PORT) private readonly scanner: ScannerPort,
    @Inject(OCR_PORT) private readonly ocr: OcrPort,
    @Inject(KMS_PORT) private readonly kms: KmsPort,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(DOCUMENT_VERSION_REPOSITORY) private readonly versions: DocumentVersionRepository,
    @Inject(ENV) private readonly env: Env,
    private readonly audit: AuditService,
  ) {}

  async promote(input: PromoteInput): Promise<PromoteResult> {
    const doc = await this.documents.findById(input.documentId);
    if (!doc || doc.ownerId !== input.ownerId) {
      return { status: DocumentStatus.FAILED };
    }
    await this.documents.updateStatus(doc.id, DocumentStatus.SCANNING);

    const bytes = await this.storage.readQuarantine(input.quarantineKey);

    // Enforce the size ceiling defensively (§9: 500 MB).
    if (bytes.byteLength > this.env.MAX_UPLOAD_BYTES) {
      return this.reject(doc.id, input, DocumentStatus.INVALID, 'document.validation.oversize');
    }

    // 1) Antivirus.
    const verdict = await this.scanner.scan(bytes);
    if (verdict === ScanVerdict.INFECTED) {
      return this.reject(doc.id, input, DocumentStatus.INFECTED, 'document.scan.infected');
    }
    if (verdict === ScanVerdict.ERROR) {
      await this.documents.updateStatus(doc.id, DocumentStatus.FAILED);
      await this.record(doc, 'document.scan.error', {});
      return { status: DocumentStatus.FAILED };
    }

    // 2) Magic-byte validation.
    if (!magicBytesMatch(bytes, input.mimeType)) {
      return this.reject(doc.id, input, DocumentStatus.INVALID, 'document.validation.magic_bytes');
    }

    // 3) Integrity hash (recorded before promotion).
    const sha256 = sha256Hex(bytes);

    // 4) Envelope encryption.
    const version = doc.currentVersion + 1;
    const dek = generateDek();
    const aad = `${doc.id}:v${String(version)}`;
    const blob = encryptContent(dek, bytes, aad);
    const wrappedDek = await this.kms.wrapDek(dek);
    dek.fill(0); // zeroise plaintext key material

    // 5) Promote to the documents bucket, under an Object Lock retention when
    //    compliance locking is configured (§Phase 5 — WORM for legal records).
    const storageKey = `documents/${doc.ownerId}/${doc.id}/v${String(version)}`;
    const retention = retentionFor(
      this.env.DOCUMENTS_OBJECT_LOCK_MODE,
      this.env.DOCUMENTS_RETENTION_YEARS,
      new Date(),
    );
    await this.storage.putDocument(storageKey, blob.ciphertext, retention);

    // 6) Best-effort OCR (feeds metadata search; never blocks promotion).
    let ocrText: string | null = null;
    try {
      ocrText = await this.ocr.extractText(bytes, input.mimeType);
    } catch (err) {
      this.logger.warn(`OCR failed for ${doc.id}: ${String(err)}`);
    }

    await this.versions.add({
      id: uuidv7(),
      documentId: doc.id,
      version,
      sizeBytes: bytes.byteLength,
      mimeType: input.mimeType,
      sha256,
      scanVerdict: ScanVerdict.CLEAN,
      storageKey,
      wrappedDek,
      contentIv: Buffer.from(blob.iv).toString('base64'),
      contentTag: Buffer.from(blob.tag).toString('base64'),
      ocrText,
    });
    await this.documents.promote(doc.id, version);
    await this.storage.deleteQuarantine(input.quarantineKey);
    await this.record(doc, 'document.promoted', { version, sha256 });

    return { status: DocumentStatus.READY, version, sha256 };
  }

  private async reject(
    documentId: string,
    input: PromoteInput,
    status: DocumentStatus,
    eventType: string,
  ): Promise<PromoteResult> {
    await this.documents.updateStatus(documentId, status);
    await this.storage.deleteQuarantine(input.quarantineKey);
    await this.audit.record({
      actorUserId: input.ownerId,
      eventType,
      resource: `document:${documentId}`,
      payload: { mimeType: input.mimeType },
    });
    return { status };
  }

  private async record(
    doc: { id: string; ownerId: string },
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.record({
      actorUserId: doc.ownerId,
      eventType,
      resource: `document:${doc.id}`,
      payload,
    });
  }
}
