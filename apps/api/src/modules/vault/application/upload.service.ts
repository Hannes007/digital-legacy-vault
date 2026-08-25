import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { DocumentStatus, DocumentType } from '@dlv/shared-types';

import { ENV } from '../../../common/tokens';
import { CLOCK } from '../../../common/tokens';
import { EntitlementService } from '../../billing/application/entitlement.service';
import { PromotionService } from './promotion.service';
import {
  DOCUMENT_REPOSITORY,
  STORAGE_PORT,
  UPLOAD_METADATA_STORE,
  VAULT_REPOSITORY,
  type DocumentRepository,
  type StoragePort,
  type UploadMetadataStore,
  type VaultRepository,
} from './ports';

import type { Clock } from '../../../common/time/clock';
import type { Env } from '@dlv/config';
import type {
  UploadCompleteRequest,
  UploadInitRequest,
  UploadInitResponse,
} from '@dlv/shared-types';

/** Strip any path components so a filename cannot become a key traversal. */
function safeSegment(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? 'file';
  return base.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '').slice(0, 200) || 'file';
}

@Injectable()
export class UploadService {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(VAULT_REPOSITORY) private readonly vaults: VaultRepository,
    @Inject(UPLOAD_METADATA_STORE) private readonly pending: UploadMetadataStore,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly promotion: PromotionService,
    private readonly entitlements: EntitlementService,
  ) {}

  async initUpload(ownerId: string, req: UploadInitRequest): Promise<UploadInitResponse> {
    if (req.sizeBytes <= 0 || req.sizeBytes > this.env.MAX_UPLOAD_BYTES) {
      throw new BadRequestException(`File exceeds the ${String(this.env.MAX_UPLOAD_BYTES)}-byte limit.`);
    }
    if (req.partCount < 1 || req.partCount > 10_000) {
      throw new BadRequestException('Invalid part count.');
    }

    // Enforce plan document-count + storage limits (Phase 6, freemium).
    await this.entitlements.assertCanAddDocument(ownerId, req.sizeBytes);

    const vault = req.vaultId
      ? await this.vaults.findById(req.vaultId)
      : await this.vaults.ensureDefault(ownerId);
    if (!vault || vault.ownerId !== ownerId) {
      throw new ForbiddenException('Vault not found.');
    }

    const documentId = uuidv7();
    const quarantineKey = `quarantine/${ownerId}/${documentId}/${safeSegment(req.fileName)}`;

    await this.documents.create({
      id: documentId,
      vaultId: vault.id,
      ownerId,
      title: req.fileName,
      type: req.type ?? DocumentType.OTHER,
    });

    const { uploadId, parts } = await this.storage.initQuarantineUpload(
      quarantineKey,
      req.mimeType,
      req.partCount,
    );

    const ttl = this.env.UPLOAD_URL_TTL_SECONDS;
    await this.pending.put(
      documentId,
      { ownerId, quarantineKey, mimeType: req.mimeType, sizeBytes: req.sizeBytes },
      ttl,
    );

    return {
      documentId,
      uploadId,
      storageKey: quarantineKey,
      parts,
      expiresAt: new Date(this.clock.now().getTime() + ttl * 1000).toISOString(),
    };
  }

  /**
   * Finalise the multipart upload and run the promotion pipeline. In production
   * this enqueues a BullMQ job for the worker; here it runs synchronously so the
   * slice is end-to-end testable. Returns the resulting document status.
   */
  async completeUpload(
    ownerId: string,
    req: UploadCompleteRequest,
  ): Promise<{ documentId: string; status: DocumentStatus }> {
    const meta = await this.pending.take(req.documentId);
    if (!meta || meta.ownerId !== ownerId) {
      throw new ForbiddenException('Unknown or expired upload.');
    }
    await this.storage.completeQuarantineUpload(meta.quarantineKey, req.uploadId, req.parts);

    const result = await this.promotion.promote({
      documentId: req.documentId,
      ownerId,
      quarantineKey: meta.quarantineKey,
      mimeType: meta.mimeType,
    });
    return { documentId: req.documentId, status: result.status };
  }
}
