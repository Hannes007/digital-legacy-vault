import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { TagRepository } from '../application/ports';

@Injectable()
export class PrismaTagRepository implements TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async attach(input: { ownerId: string; documentId: string; label: string; tagId: string }): Promise<void> {
    const tag = (await this.prisma.tag.upsert({
      where: { ownerId_label: { ownerId: input.ownerId, label: input.label } },
      update: {},
      create: { id: input.tagId, ownerId: input.ownerId, label: input.label },
      select: { id: true },
    })) as { id: string };
    await this.prisma.documentTag.upsert({
      where: { documentId_tagId: { documentId: input.documentId, tagId: tag.id } },
      update: {},
      create: { documentId: input.documentId, tagId: tag.id },
    });
  }

  async listLabels(documentId: string): Promise<string[]> {
    const links = (await this.prisma.documentTag.findMany({
      where: { documentId },
      select: { tag: { select: { label: true } } },
    })) as Array<{ tag: { label: string } }>;
    return links.map((l) => l.tag.label);
  }
}
