import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type {
  CreateWebauthnCredentialInput,
  WebauthnCredentialAuthRecord,
  WebauthnCredentialListRow,
  WebauthnCredentialRepository,
} from '../application/mfa-ports';

/** Prisma-backed {@link WebauthnCredentialRepository}. */
@Injectable()
export class PrismaWebauthnCredentialRepository implements WebauthnCredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWebauthnCredentialInput): Promise<void> {
    await this.prisma.webauthnCredential.create({
      data: {
        id: input.id,
        userId: input.userId,
        credentialId: input.credentialId,
        publicKey: Buffer.from(input.publicKey),
        signCount: BigInt(input.signCount),
        transports: input.transports ?? undefined,
        deviceType: input.deviceType,
        backedUp: input.backedUp,
        aaguid: input.aaguid,
        deviceLabel: input.deviceLabel,
      },
    });
  }

  async findByCredentialId(credentialId: string): Promise<WebauthnCredentialAuthRecord | null> {
    const row = await this.prisma.webauthnCredential.findFirst({
      where: { credentialId, revokedAt: null },
      select: { id: true, userId: true, publicKey: true, signCount: true, transports: true },
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      userId: row.userId,
      publicKey: Uint8Array.from(row.publicKey),
      signCount: Number(row.signCount),
      transports: (row.transports as string[] | null) ?? null,
    };
  }

  listActiveByUser(userId: string): Promise<WebauthnCredentialListRow[]> {
    return this.prisma.webauthnCredential.findMany({
      where: { userId, revokedAt: null },
      select: { id: true, deviceLabel: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async activeCredentialIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.webauthnCredential.findMany({
      where: { userId, revokedAt: null },
      select: { credentialId: true },
    });
    return rows.map((r: { credentialId: string }) => r.credentialId);
  }

  async updateOnAuth(id: string, signCount: number, lastUsedAt: Date): Promise<void> {
    await this.prisma.webauthnCredential.update({
      where: { id },
      data: { signCount: BigInt(signCount), lastUsedAt },
    });
  }

  async revokeOwned(id: string, userId: string, when: Date): Promise<boolean> {
    const result = await this.prisma.webauthnCredential.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: when },
    });
    return result.count > 0;
  }

  countActiveByUser(userId: string): Promise<number> {
    return this.prisma.webauthnCredential.count({ where: { userId, revokedAt: null } });
  }
}
