import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { ClientVaultRecord, ClientVaultRepository } from '../application/ports';

const SELECT = { id: true, ownerId: true, label: true, ciphertext: true, iv: true, createdAt: true } as const;

@Injectable()
export class PrismaClientVaultRepository implements ClientVaultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    id: string;
    ownerId: string;
    label: string;
    ciphertext: string;
    iv: string;
  }): Promise<ClientVaultRecord> {
    return (await this.prisma.clientVaultItem.create({ data: input, select: SELECT })) as ClientVaultRecord;
  }

  async listByOwner(ownerId: string): Promise<ClientVaultRecord[]> {
    return (await this.prisma.clientVaultItem.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    })) as ClientVaultRecord[];
  }

  async findById(id: string): Promise<ClientVaultRecord | null> {
    return (await this.prisma.clientVaultItem.findUnique({ where: { id }, select: SELECT })) as ClientVaultRecord | null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.clientVaultItem.delete({ where: { id } });
  }
}
