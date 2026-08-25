import { Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { DataSubjectExportData, DataSubjectRepository, ErasureCounts } from '../application/ports';

/**
 * Cross-cutting compliance read/write model (Phase 5). Owns direct Prisma access
 * across contexts because a data-subject request is inherently cross-cutting —
 * it reads and erases everything about one person in a single, consistent pass.
 */
@Injectable()
export class PrismaDataSubjectRepository implements DataSubjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exportData(userId: string): Promise<DataSubjectExportData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
        roles: { select: { role: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found.');

    const [documents, signatures, consents, clientVaultItems, vaults] = await Promise.all([
      this.prisma.document.findMany({
        where: { ownerId: userId },
        select: { id: true, title: true, type: true, status: true, currentVersion: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.signature.findMany({
        where: { signerUserId: userId },
        select: { id: true, requestId: true, method: true, sealDigest: true, createdAt: true },
      }),
      this.prisma.consent.findMany({
        where: { userId },
        select: { id: true, purpose: true, status: true, grantedAt: true, withdrawnAt: true },
      }),
      this.prisma.clientVaultItem.findMany({
        where: { ownerId: userId },
        select: { id: true, label: true, createdAt: true },
      }),
      this.prisma.vault.findMany({ where: { ownerId: userId }, select: { id: true } }),
    ]);

    return {
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        roles: user.roles.map((r: { role: string }) => r.role),
        createdAt: user.createdAt,
      },
      documents,
      signatures,
      consents,
      clientVaultItems,
      documentIds: documents.map((d: { id: string }) => d.id),
      vaultIds: vaults.map((v: { id: string }) => v.id),
    };
  }

  async gatherScope(userId: string): Promise<{ documentIds: string[]; vaultIds: string[] }> {
    const [documents, vaults] = await Promise.all([
      this.prisma.document.findMany({ where: { ownerId: userId }, select: { id: true } }),
      this.prisma.vault.findMany({ where: { ownerId: userId }, select: { id: true } }),
    ]);
    return { documentIds: documents.map((d: { id: string }) => d.id), vaultIds: vaults.map((v: { id: string }) => v.id) };
  }

  async eraseData(userId: string, now: Date): Promise<ErasureCounts> {
    const docs = await this.prisma.document.findMany({ where: { ownerId: userId }, select: { id: true } });
    const documentIds = docs.map((d: { id: string }) => d.id);
    const anonymisedEmail = `erased-${uuidv7()}@deleted.invalid`;

    const [versions, clientItems, sessions] = await this.prisma.$transaction([
      // Crypto-shred: destroy the wrapped DEKs so WORM-retained ciphertext is
      // permanently unrecoverable without deleting Object-Locked S3 objects.
      this.prisma.documentVersion.updateMany({ where: { documentId: { in: documentIds } }, data: { wrappedDek: '' } }),
      this.prisma.clientVaultItem.deleteMany({ where: { ownerId: userId } }),
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { email: anonymisedEmail, firstName: 'Erased', lastName: 'User', deletedAt: now },
      }),
    ]);

    return {
      documentVersionsShredded: versions.count,
      clientVaultItemsDeleted: clientItems.count,
      sessionsRevoked: sessions.count,
    };
  }
}
