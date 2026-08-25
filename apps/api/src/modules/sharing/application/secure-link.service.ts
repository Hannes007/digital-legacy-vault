import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { generateOpaqueToken, sha256Hex } from '@dlv/crypto';
import { ShareStatus, SharePermission, type SecureLinkDto } from '@dlv/shared-types';

import { AuditService } from '../../audit/audit.service';
import { CLOCK, ENV } from '../../../common/tokens';
import { DOCUMENT_REPOSITORY, type DocumentRepository } from '../../vault/application/ports';
import { SECURE_LINK_REPOSITORY, type SecureLinkRecord, type SecureLinkRepository } from './ports';

import type { Clock } from '../../../common/time/clock';
import type { Env } from '@dlv/config';

const DEFAULT_EXPIRY_DAYS = 7;
const MAX_EXPIRY_DAYS = 90; // PROJECT_MEMORY §9

/** Resolved link target when a token is valid. */
export interface ResolvedLink {
  documentId: string;
  permission: SharePermission;
}

@Injectable()
export class SecureLinkService {
  constructor(
    @Inject(SECURE_LINK_REPOSITORY) private readonly links: SecureLinkRepository,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
    private readonly audit: AuditService,
  ) {}

  async create(
    ownerId: string,
    input: { documentId: string; permission?: SharePermission; expiresInDays?: number; maxViews?: number },
  ): Promise<SecureLinkDto> {
    const doc = await this.documents.findById(input.documentId);
    if (!doc) throw new NotFoundException('Document not found.');
    if (doc.ownerId !== ownerId) throw new ForbiddenException('Not your document.');

    const days = input.expiresInDays ?? DEFAULT_EXPIRY_DAYS;
    if (days < 1 || days > MAX_EXPIRY_DAYS) {
      throw new BadRequestException(`Expiry must be 1–${String(MAX_EXPIRY_DAYS)} days.`);
    }
    const token = generateOpaqueToken(32); // high-entropy, base64url
    const expiresAt = new Date(this.clock.now().getTime() + days * 86_400_000);
    const record = await this.links.create({
      id: uuidv7(),
      documentId: input.documentId,
      ownerId,
      tokenHash: sha256Hex(token),
      permission: input.permission ?? SharePermission.VIEW,
      maxViews: input.maxViews ?? null,
      expiresAt,
    });
    await this.audit.record({
      actorUserId: ownerId,
      eventType: 'secure_link.created',
      resource: `document:${input.documentId}`,
      payload: { linkId: record.id, expiresAt: expiresAt.toISOString() },
    });
    return { ...toDto(record), url: `${this.env.WEB_BASE_URL}/s/${token}` };
  }

  async list(ownerId: string): Promise<SecureLinkDto[]> {
    return (await this.links.listByOwner(ownerId)).map(toDto);
  }

  /** Public resolution: enforce status, expiry, and max-views; count the view. */
  async resolve(token: string): Promise<ResolvedLink> {
    const link = await this.links.findByTokenHash(sha256Hex(token));
    if (!link || link.status !== ShareStatus.ACTIVE) throw new NotFoundException('Link not found.');
    if (link.expiresAt.getTime() <= this.clock.now().getTime()) throw new NotFoundException('Link has expired.');
    if (link.maxViews !== null && link.viewCount >= link.maxViews) {
      throw new NotFoundException('Link view limit reached.');
    }
    await this.links.incrementViews(link.id);
    await this.audit.record({
      actorUserId: null,
      eventType: 'secure_link.viewed',
      resource: `document:${link.documentId}`,
      payload: { linkId: link.id },
    });
    return { documentId: link.documentId, permission: link.permission };
  }

  async revoke(ownerId: string, id: string): Promise<void> {
    const links = await this.links.listByOwner(ownerId);
    const link = links.find((l) => l.id === id);
    if (!link) throw new NotFoundException('Link not found.');
    await this.links.revoke(id, this.clock.now());
    await this.audit.record({
      actorUserId: ownerId,
      eventType: 'secure_link.revoked',
      resource: `document:${link.documentId}`,
      payload: { linkId: id },
    });
  }
}

function toDto(r: SecureLinkRecord): SecureLinkDto {
  return {
    id: r.id,
    documentId: r.documentId,
    permission: r.permission,
    status: r.status,
    maxViews: r.maxViews,
    viewCount: r.viewCount,
    expiresAt: r.expiresAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  };
}
