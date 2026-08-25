import { Inject, Injectable, Logger } from '@nestjs/common';

import { CLOCK, ENV } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import { retentionFor } from '../domain/retention';

import {
  DOCUMENT_REPOSITORY,
  DOCUMENT_VERSION_REPOSITORY,
  STORAGE_PORT,
  type DocumentRepository,
  type DocumentVersionRepository,
  type StoragePort,
} from './ports';

import type { Clock } from '../../../common/time/clock';
import type { Env } from '@dlv/config';

/**
 * Applies an S3 Object Lock **compliance-mode** retention to a document's
 * current version once it has been signed/sealed (Phase 5). Signed legal records
 * get the strongest WORM protection for `SIGNED_DOCUMENT_RETENTION_YEARS`.
 *
 * A no-op when Object Lock is disabled (`DOCUMENTS_OBJECT_LOCK_MODE=NONE`, e.g.
 * dev) so the signing ceremony never fails for want of a locked bucket. Exported
 * for the signature context to call after sealing.
 */
@Injectable()
export class DocumentRetentionService {
  private readonly logger = new Logger(DocumentRetentionService.name);

  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(DOCUMENT_VERSION_REPOSITORY) private readonly versions: DocumentVersionRepository,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async applySignedRetention(documentId: string): Promise<void> {
    if (this.env.DOCUMENTS_OBJECT_LOCK_MODE === 'NONE') return;

    const doc = await this.documents.findById(documentId);
    if (!doc) return;
    const versions = await this.versions.listByDocument(documentId);
    const current = versions.find((v) => v.version === doc.currentVersion) ?? versions[0];
    if (!current) return;

    const retention = retentionFor('COMPLIANCE', this.env.SIGNED_DOCUMENT_RETENTION_YEARS, this.clock.now());
    if (!retention) return;

    try {
      await this.storage.applyRetention(current.storageKey, retention);
      await this.audit.record({
        actorUserId: doc.ownerId,
        eventType: 'document.retention.applied',
        resource: `document:${documentId}`,
        payload: { mode: retention.mode, retainUntil: retention.retainUntil.toISOString(), version: current.version },
      });
    } catch (err) {
      // Never fail the seal because retention couldn't be written; surface it.
      this.logger.error(`Failed to apply Object Lock retention for ${documentId}: ${String(err)}`);
    }
  }
}
