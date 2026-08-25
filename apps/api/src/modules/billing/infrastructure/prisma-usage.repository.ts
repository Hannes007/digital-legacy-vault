import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { UsageRepository, UsageSnapshot } from '../application/ports';

/** Cross-cutting usage read model for entitlement gating (Phase 6). */
@Injectable()
export class PrismaUsageRepository implements UsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(userId: string, monthStart: Date): Promise<UsageSnapshot> {
    const [documents, vaults, activeSecureLinks, signaturesThisMonth, storageAgg] = await Promise.all([
      this.prisma.document.count({ where: { ownerId: userId } }),
      this.prisma.vault.count({ where: { ownerId: userId } }),
      this.prisma.secureLink.count({ where: { ownerId: userId, status: 'ACTIVE' } }),
      this.prisma.signature.count({ where: { signerUserId: userId, createdAt: { gte: monthStart } } }),
      this.prisma.documentVersion.aggregate({ _sum: { sizeBytes: true }, where: { document: { ownerId: userId } } }),
    ]);
    const sum = storageAgg?._sum?.sizeBytes;
    return {
      documents: Number(documents),
      vaults: Number(vaults),
      activeSecureLinks: Number(activeSecureLinks),
      signaturesThisMonth: Number(signaturesThisMonth),
      storageBytes: sum ? Number(sum) : 0,
    };
  }

  async findUserEmail(userId: string): Promise<string | null> {
    const user = (await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })) as
      | { email: string }
      | null;
    return user?.email ?? null;
  }
}
