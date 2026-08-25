import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { CategoryRecord, CategoryRepository } from '../application/ports';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: { id: string; ownerId: string; name: string }): Promise<CategoryRecord> {
    return (await this.prisma.documentCategory.create({
      data: input,
      select: { id: true, ownerId: true, name: true },
    })) as CategoryRecord;
  }

  async listByOwner(ownerId: string): Promise<Array<CategoryRecord & { documentCount: number }>> {
    const rows = (await this.prisma.documentCategory.findMany({
      where: { ownerId },
      orderBy: { name: 'asc' },
      select: { id: true, ownerId: true, name: true, _count: { select: { documents: true } } },
    })) as Array<CategoryRecord & { _count: { documents: number } }>;
    return rows.map((r) => ({ id: r.id, ownerId: r.ownerId, name: r.name, documentCount: r._count.documents }));
  }
}
