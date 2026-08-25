import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { AccessRequestStatus, type AccessRequestDto } from '@dlv/shared-types';

import { AuditService } from '../../audit/audit.service';
import { CLOCK } from '../../../common/tokens';
import { DOCUMENT_REPOSITORY, type DocumentRepository } from '../../vault/application/ports';
import { ACCESS_REQUEST_REPOSITORY, type AccessRequestRecord, type AccessRequestRepository } from './ports';

import type { Clock } from '../../../common/time/clock';

@Injectable()
export class AccessRequestService {
  constructor(
    @Inject(ACCESS_REQUEST_REPOSITORY) private readonly requests: AccessRequestRepository,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async request(requesterId: string, documentId: string, message: string | null): Promise<AccessRequestDto> {
    const doc = await this.documents.findById(documentId);
    if (!doc) throw new NotFoundException('Document not found.');
    if (doc.ownerId === requesterId) throw new ForbiddenException('You already own this document.');
    const record = await this.requests.create({ id: uuidv7(), documentId, ownerId: doc.ownerId, requesterId, message });
    await this.audit.record({
      actorUserId: requesterId,
      eventType: 'access_request.created',
      resource: `document:${documentId}`,
      payload: { requestId: record.id },
    });
    return toDto(record);
  }

  async listForOwner(ownerId: string): Promise<AccessRequestDto[]> {
    return (await this.requests.listForOwner(ownerId)).map(toDto);
  }

  async decide(ownerId: string, id: string, approve: boolean): Promise<void> {
    const req = await this.requests.findById(id);
    if (!req) throw new NotFoundException('Request not found.');
    if (req.ownerId !== ownerId) throw new ForbiddenException('Not your request to decide.');
    const status = approve ? AccessRequestStatus.APPROVED : AccessRequestStatus.DENIED;
    await this.requests.setStatus(id, status, this.clock.now());
    await this.audit.record({
      actorUserId: ownerId,
      eventType: approve ? 'access_request.approved' : 'access_request.denied',
      resource: `document:${req.documentId}`,
      payload: { requestId: id },
    });
  }
}

function toDto(r: AccessRequestRecord): AccessRequestDto {
  return {
    id: r.id,
    documentId: r.documentId,
    ownerId: r.ownerId,
    requesterId: r.requesterId,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}
