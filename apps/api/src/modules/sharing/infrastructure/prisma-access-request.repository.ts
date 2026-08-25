import { Injectable } from '@nestjs/common';

import { AccessRequestStatus } from '@dlv/shared-types';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { AccessRequestRecord, AccessRequestRepository } from '../application/ports';

interface Row {
  id: string; documentId: string; ownerId: string; requesterId: string;
  message: string | null; status: string; createdAt: Date;
}
const SELECT = { id: true, documentId: true, ownerId: true, requesterId: true, message: true, status: true, createdAt: true } as const;
const map = (r: Row): AccessRequestRecord => ({ ...r, status: r.status as AccessRequestStatus });

@Injectable()
export class PrismaAccessRequestRepository implements AccessRequestRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(input: { id: string; documentId: string; ownerId: string; requesterId: string; message: string | null }): Promise<AccessRequestRecord> {
    return map((await this.prisma.accessRequest.create({ data: input, select: SELECT })) as Row);
  }
  async findById(id: string): Promise<AccessRequestRecord | null> {
    const r = (await this.prisma.accessRequest.findUnique({ where: { id }, select: SELECT })) as Row | null;
    return r ? map(r) : null;
  }
  async listForOwner(ownerId: string): Promise<AccessRequestRecord[]> {
    return ((await this.prisma.accessRequest.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' }, select: SELECT })) as Row[]).map(map);
  }
  async setStatus(id: string, status: AccessRequestStatus, at: Date): Promise<void> {
    await this.prisma.accessRequest.update({ where: { id }, data: { status, decidedAt: at } });
  }
}
