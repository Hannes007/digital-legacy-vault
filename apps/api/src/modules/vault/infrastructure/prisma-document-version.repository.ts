import { Injectable } from '@nestjs/common';

import { ScanVerdict } from '@dlv/shared-types';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  CreateVersionInput,
  DocumentVersionRecord,
  DocumentVersionRepository,
} from '../application/ports';

interface Row {
  id: string;
  documentId: string;
  version: number;
  sizeBytes: bigint;
  mimeType: string;
  sha256: string;
  scanVerdict: string;
  storageKey: string;
  createdAt: Date;
}

const SELECT = {
  id: true,
  documentId: true,
  version: true,
  sizeBytes: true,
  mimeType: true,
  sha256: true,
  scanVerdict: true,
  storageKey: true,
  createdAt: true,
} as const;

function toRecord(row: Row): DocumentVersionRecord {
  return {
    id: row.id,
    documentId: row.documentId,
    version: row.version,
    sizeBytes: Number(row.sizeBytes),
    mimeType: row.mimeType,
    sha256: row.sha256,
    scanVerdict: row.scanVerdict as ScanVerdict,
    storageKey: row.storageKey,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaDocumentVersionRepository implements DocumentVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(input: CreateVersionInput): Promise<DocumentVersionRecord> {
    const row = (await this.prisma.documentVersion.create({
      data: {
        id: input.id,
        documentId: input.documentId,
        version: input.version,
        sizeBytes: BigInt(input.sizeBytes),
        mimeType: input.mimeType,
        sha256: input.sha256,
        scanVerdict: input.scanVerdict,
        storageKey: input.storageKey,
        wrappedDek: input.wrappedDek,
        contentIv: input.contentIv,
        contentTag: input.contentTag,
        ocrText: input.ocrText,
      },
      select: SELECT,
    })) as Row;
    return toRecord(row);
  }

  async listByDocument(documentId: string): Promise<DocumentVersionRecord[]> {
    const rows = (await this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: SELECT,
    })) as Row[];
    return rows.map(toRecord);
  }
}
