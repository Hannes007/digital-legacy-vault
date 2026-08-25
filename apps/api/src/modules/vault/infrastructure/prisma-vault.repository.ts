import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { VaultRecord, VaultRepository } from '../application/ports';

interface Row {
  id: string;
  ownerId: string;
  kind: string;
  name: string;
}
const SELECT = { id: true, ownerId: true, kind: true, name: true } as const;

@Injectable()
export class PrismaVaultRepository implements VaultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefault(ownerId: string): Promise<VaultRecord> {
    const existing = (await this.prisma.vault.findFirst({
      where: { ownerId, kind: 'STANDARD' },
      select: SELECT,
    })) as Row | null;
    if (existing) return existing;
    return (await this.prisma.vault.create({
      data: { id: uuidv7(), ownerId, kind: 'STANDARD', name: 'My Vault' },
      select: SELECT,
    })) as Row;
  }

  async findById(id: string): Promise<VaultRecord | null> {
    return (await this.prisma.vault.findUnique({ where: { id }, select: SELECT })) as Row | null;
  }
}
