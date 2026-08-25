import { Injectable } from '@nestjs/common';

import { DocumentStatus } from '@dlv/shared-types';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { CreateDocumentInput, DocumentRecord, DocumentRepository } from '../application/ports';

interface Row {
  id: string;
  vaultId: string;
  ownerId: string;
  title: string;
  type: string;
  status: string;
  categoryId: string | null;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const SELECT = {
  id: true,
  vaultId: true,
  ownerId: true,
  title: true,
  type: true,
  status: true,
  categoryId: true,
  currentVersion: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toRecord(row: Row): DocumentRecord {
  return { ...row, status: row.status as DocumentStatus };
}

@Injectable()
export class PrismaDocumentRepository implements DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateDocumentInput): Promise<DocumentRecord> {
    const row = (await this.prisma.document.create({
      data: {
        id: input.id,
        vaultId: input.vaultId,
        ownerId: input.ownerId,
        title: input.title,
        type: input.type,
        status: DocumentStatus.PENDING_UPLOAD,
      },
      select: SELECT,
    })) as Row;
    return toRecord(row);
  }

  async findById(id: string): Promise<DocumentRecord | null> {
    const row = (await this.prisma.document.findUnique({ where: { id }, select: SELECT })) as Row | null;
    return row ? toRecord(row) : null;
  }

  async listByOwner(ownerId: string): Promise<DocumentRecord[]> {
    const rows = (await this.prisma.document.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    })) as Row[];
    return rows.map(toRecord);
  }

  async updateStatus(id: string, status: DocumentStatus): Promise<void> {
    await this.prisma.document.update({ where: { id }, data: { status } });
  }

  async promote(id: string, version: number): Promise<void> {
    await this.prisma.document.update({
      where: { id },
      data: { currentVersion: version, status: DocumentStatus.READY },
    });
  }

  async setCategory(id: string, categoryId: string | null): Promise<void> {
    await this.prisma.document.update({ where: { id }, data: { categoryId } });
  }
}
