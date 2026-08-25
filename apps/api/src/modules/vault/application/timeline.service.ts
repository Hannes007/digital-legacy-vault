import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { DOCUMENT_REPOSITORY, type DocumentRepository } from './ports';

import type { TimelineEntryDto } from '@dlv/shared-types';

interface AuditRow {
  id: string;
  occurredAt: Date;
  eventType: string;
  actorUserId: string | null;
  resource: string;
  eventHash: string;
}

/**
 * Document activity timeline (audit context + hash chain, roadmap §3). Reads the
 * append-only audit log for the document's resource; `eventHash` lets a client
 * verify the chain independently (§7.4).
 */
@Injectable()
export class TimelineService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
  ) {}

  async getTimeline(ownerId: string, documentId: string): Promise<TimelineEntryDto[]> {
    const doc = await this.documents.findById(documentId);
    if (!doc) throw new NotFoundException('Document not found.');
    if (doc.ownerId !== ownerId) throw new ForbiddenException('Not your document.');

    const rows = (await this.prisma.auditEvent.findMany({
      where: { resource: `document:${documentId}` },
      orderBy: { occurredAt: 'asc' },
      select: {
        id: true,
        occurredAt: true,
        eventType: true,
        actorUserId: true,
        resource: true,
        eventHash: true,
      },
    })) as AuditRow[];

    return rows.map((r) => ({
      id: r.id,
      occurredAt: r.occurredAt.toISOString(),
      eventType: r.eventType,
      actorUserId: r.actorUserId,
      resource: r.resource,
      summary: summarise(r.eventType),
      eventHash: r.eventHash,
    }));
  }
}

function summarise(eventType: string): string {
  const map: Record<string, string> = {
    'document.promoted': 'Document scanned, encrypted and saved',
    'document.scan.infected': 'Upload rejected: malware detected',
    'document.validation.magic_bytes': 'Upload rejected: file type mismatch',
    'document.validation.oversize': 'Upload rejected: file too large',
    'document.tag.added': 'Tag added',
  };
  return map[eventType] ?? eventType;
}
