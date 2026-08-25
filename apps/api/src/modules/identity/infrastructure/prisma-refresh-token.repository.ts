import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  RefreshTokenRepository,
  RefreshTokenStatus,
} from '../application/ports';

/** Prisma-backed {@link RefreshTokenRepository}. */
@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRefreshTokenInput): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        id: input.id,
        sessionId: input.sessionId,
        userId: input.userId,
        familyId: input.familyId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        sessionId: true,
        userId: true,
        familyId: true,
        status: true,
        expiresAt: true,
      },
    });
    if (!row) {
      return null;
    }
    return { ...row, status: row.status as RefreshTokenStatus };
  }

  async markRotated(oldId: string, newId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: oldId },
      data: { status: 'ROTATED', rotatedToId: newId },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, status: { in: ['ACTIVE', 'ROTATED'] } },
      data: { status: 'REVOKED' },
    });
  }

  async revokeBySession(sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, status: { in: ['ACTIVE', 'ROTATED'] } },
      data: { status: 'REVOKED' },
    });
  }
}
