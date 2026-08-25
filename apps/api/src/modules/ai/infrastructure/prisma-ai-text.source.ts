import { DocumentType, VaultKind } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { AiTextSource, DocumentTextRecord } from '../application/ports';
import type { DocumentStatus } from '@dlv/shared-types';

interface DocumentRow {
  id: string;
  ownerId: string;
  title: string;
  type: string;
  status: DocumentStatus;
  currentVersion: number;
  vault: { kind: VaultKind };
  versions: Array<{ ocrText: string | null }>;
}

/**
 * Cross-cutting document-text read model for the AI context (Phase 7), in the
 * same spirit as billing's `PrismaUsageRepository`. Exposes the vault kind so
 * the domain guard (`toServerProcessable`) — not this adapter — decides
 * processability, and restricts the type inventory to STANDARD vaults at the
 * query level (defence in depth alongside the type-level exclusion).
 */
@Injectable()
export class PrismaAiTextSource implements AiTextSource {
  constructor(private readonly prisma: PrismaService) {}

  async getDocumentText(documentId: string): Promise<DocumentTextRecord | null> {
    const row = (await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        type: true,
        status: true,
        currentVersion: true,
        vault: { select: { kind: true } },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { ocrText: true },
        },
      },
    })) as DocumentRow | null;
    if (!row) return null;
    return {
      documentId: row.id,
      ownerId: row.ownerId,
      title: row.title,
      type: row.type,
      status: row.status,
      vaultKind: row.vault.kind,
      text: row.versions[0]?.ocrText ?? null,
    };
  }

  async listOwnerDocumentTypes(ownerId: string): Promise<string[]> {
    const groups = (await this.prisma.document.groupBy({
      by: ['type'],
      where: { ownerId, vault: { kind: VaultKind.STANDARD } },
    })) as Array<{ type: string }>;
    return groups.map((g) => g.type);
  }

  async applySuggestedType(documentId: string, type: DocumentType): Promise<void> {
    await this.prisma.document.update({ where: { id: documentId }, data: { type } });
  }
}
