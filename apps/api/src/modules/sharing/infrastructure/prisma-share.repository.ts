import { Injectable } from '@nestjs/common';

import { SharePermission, ShareStatus } from '@dlv/shared-types';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { CreateShareInput, ShareRecord, ShareRepository } from '../application/ports';

interface Row {
  id: string; documentId: string; ownerId: string; recipientEmail: string;
  permission: string; status: string; expiresAt: Date | null; createdAt: Date;
}
const SELECT = { id: true, documentId: true, ownerId: true, recipientEmail: true, permission: true, status: true, expiresAt: true, createdAt: true } as const;
const map = (r: Row): ShareRecord => ({ ...r, permission: r.permission as SharePermission, status: r.status as ShareStatus });

@Injectable()
export class PrismaShareRepository implements ShareRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(input: CreateShareInput): Promise<ShareRecord> {
    return map((await this.prisma.documentShare.create({ data: input, select: SELECT })) as Row);
  }
  async findById(id: string): Promise<ShareRecord | null> {
    const r = (await this.prisma.documentShare.findUnique({ where: { id }, select: SELECT })) as Row | null;
    return r ? map(r) : null;
  }
  async listByOwner(ownerId: string): Promise<ShareRecord[]> {
    return ((await this.prisma.documentShare.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' }, select: SELECT })) as Row[]).map(map);
  }
  async revoke(id: string, at: Date): Promise<void> {
    await this.prisma.documentShare.update({ where: { id }, data: { status: ShareStatus.REVOKED, revokedAt: at } });
  }
}
