import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { TotpSecretRecord, TotpSecretRepository, TotpStatus } from '../application/mfa-ports';

/** Prisma-backed {@link TotpSecretRepository} (one secret per user). */
@Injectable()
export class PrismaTotpSecretRepository implements TotpSecretRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string): Promise<TotpSecretRecord | null> {
    const row = await this.prisma.totpSecret.findUnique({
      where: { userId },
      select: { userId: true, secretEnc: true, status: true },
    });
    return row ? { ...row, status: row.status as TotpStatus } : null;
  }

  async upsertPending(userId: string, secretEnc: string): Promise<void> {
    await this.prisma.totpSecret.upsert({
      where: { userId },
      create: { id: uuidv7(), userId, secretEnc, status: 'PENDING' },
      update: { secretEnc, status: 'PENDING', confirmedAt: null },
    });
  }

  async enable(userId: string, confirmedAt: Date): Promise<void> {
    await this.prisma.totpSecret.update({
      where: { userId },
      data: { status: 'ENABLED', confirmedAt },
    });
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.prisma.totpSecret.deleteMany({ where: { userId } });
  }
}
