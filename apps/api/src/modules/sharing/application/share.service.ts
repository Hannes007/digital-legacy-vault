import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { SharePermission, ShareStatus, type DocumentShareDto } from '@dlv/shared-types';

import { AuditService } from '../../audit/audit.service';
import { CLOCK } from '../../../common/tokens';
import { DOCUMENT_REPOSITORY, type DocumentRepository } from '../../vault/application/ports';
import { SHARE_REPOSITORY, type ShareRecord, type ShareRepository } from './ports';

import type { Clock } from '../../../common/time/clock';

@Injectable()
export class ShareService {
  constructor(
    @Inject(SHARE_REPOSITORY) private readonly shares: ShareRepository,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async share(
    ownerId: string,
    input: { documentId: string; recipientEmail: string; permission?: SharePermission; expiresInDays?: number },
  ): Promise<DocumentShareDto> {
    const doc = await this.documents.findById(input.documentId);
    if (!doc) throw new NotFoundException('Document not found.');
    if (doc.ownerId !== ownerId) throw new ForbiddenException('Not your document.');

    const expiresAt = input.expiresInDays
      ? new Date(this.clock.now().getTime() + input.expiresInDays * 86_400_000)
      : null;
    const record = await this.shares.create({
      id: uuidv7(),
      documentId: input.documentId,
      ownerId,
      recipientEmail: input.recipientEmail.toLowerCase(),
      permission: input.permission ?? SharePermission.VIEW,
      expiresAt,
    });
    await this.audit.record({
      actorUserId: ownerId,
      eventType: 'share.created',
      resource: `document:${input.documentId}`,
      payload: { recipient: record.recipientEmail, permission: record.permission },
    });
    return toDto(record);
  }

  async list(ownerId: string): Promise<DocumentShareDto[]> {
    return (await this.shares.listByOwner(ownerId)).map(toDto);
  }

  async revoke(ownerId: string, id: string): Promise<void> {
    const share = await this.shares.findById(id);
    if (!share) throw new NotFoundException('Share not found.');
    if (share.ownerId !== ownerId) throw new ForbiddenException('Not your share.');
    await this.shares.revoke(id, this.clock.now());
    await this.audit.record({
      actorUserId: ownerId,
      eventType: 'share.revoked',
      resource: `document:${share.documentId}`,
      payload: { shareId: id },
    });
  }
}

function toDto(r: ShareRecord): DocumentShareDto {
  return {
    id: r.id,
    documentId: r.documentId,
    ownerId: r.ownerId,
    recipientEmail: r.recipientEmail,
    permission: r.permission,
    status: r.status,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}
export { ShareStatus };
