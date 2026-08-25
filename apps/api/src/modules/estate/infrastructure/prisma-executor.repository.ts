import { Injectable } from '@nestjs/common';
import { RelationshipRole } from '@dlv/shared-types';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { ExecutorRecord, ExecutorRepository } from '../application/ports';

interface Row { id: string; ownerId: string; fullName: string; email: string; role: string; createdAt: Date; }
const SELECT = { id: true, ownerId: true, fullName: true, email: true, role: true, createdAt: true } as const;
const map = (r: Row): ExecutorRecord => ({ ...r, role: r.role as RelationshipRole });

@Injectable()
export class PrismaExecutorRepository implements ExecutorRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(input: { id: string; ownerId: string; fullName: string; email: string; role: RelationshipRole }): Promise<ExecutorRecord> {
    return map((await this.prisma.executor.create({ data: input, select: SELECT })) as Row);
  }
  async listByOwner(ownerId: string): Promise<ExecutorRecord[]> {
    return ((await this.prisma.executor.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' }, select: SELECT })) as Row[]).map(map);
  }
  async delete(ownerId: string, id: string): Promise<void> {
    await this.prisma.executor.deleteMany({ where: { id, ownerId } });
  }
}
