import { Injectable } from '@nestjs/common';

import { SharePermission, ShareStatus } from '@dlv/shared-types';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { CreateSecureLinkInput, SecureLinkRecord, SecureLinkRepository } from '../application/ports';

interface Row {
  id: string; documentId: string; ownerId: string; permission: string; status: string;
  maxViews: number | null; viewCount: number; expiresAt: Date; createdAt: Date;
}
const SELECT = { id: true, documentId: true, ownerId: true, permission: true, status: true, maxViews: true, viewCount: true, expiresAt: true, createdAt: true } as const;
const map = (r: Row): SecureLinkRecord => ({ ...r, permission: r.permission as SharePermission, status: r.status as ShareStatus });

@Injectable()
export class PrismaSecureLinkRepository implements SecureLinkRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(input: CreateSecureLinkInput): Promise<SecureLinkRecord> {
    return map((await this.prisma.secureLink.create({ data: input, select: SELECT })) as Row);
  }
  async findByTokenHash(tokenHash: string): Promise<SecureLinkRecord | null> {
    const r = (await this.prisma.secureLink.findUnique({ where: { tokenHash }, select: SELECT })) as Row | null;
    return r ? map(r) : null;
  }
  async listByOwner(ownerId: string): Promise<SecureLinkRecord[]> {
    return ((await this.prisma.secureLink.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' }, select: SELECT })) as Row[]).map(map);
  }
  async incrementViews(id: string): Promise<void> {
    await this.prisma.secureLink.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  }
  async revoke(id: string, at: Date): Promise<void> {
    await this.prisma.secureLink.update({ where: { id }, data: { status: ShareStatus.REVOKED, revokedAt: at } });
  }
}
