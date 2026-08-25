import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { RecoveryCodeRepository, RecoveryCodeRow } from '../application/mfa-ports';

/** Prisma-backed {@link RecoveryCodeRepository}; codes are stored Argon2id-hashed. */
@Injectable()
export class PrismaRecoveryCodeRepository implements RecoveryCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceAll(userId: string, codes: { id: string; codeHash: string }[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.recoveryCode.deleteMany({ where: { userId } }),
      this.prisma.recoveryCode.createMany({
        data: codes.map((c) => ({ id: c.id, userId, codeHash: c.codeHash })),
      }),
    ]);
  }

  listUnused(userId: string): Promise<RecoveryCodeRow[]> {
    return this.prisma.recoveryCode.findMany({
      where: { userId, usedAt: null },
      select: { id: true, codeHash: true },
    });
  }

  async markUsed(id: string, when: Date): Promise<void> {
    await this.prisma.recoveryCode.update({ where: { id }, data: { usedAt: when } });
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.prisma.recoveryCode.deleteMany({ where: { userId } });
  }
}
