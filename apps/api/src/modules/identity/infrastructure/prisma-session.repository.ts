import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type {
  CreateSessionInput,
  SessionListRow,
  SessionRecord,
  SessionRepository,
} from '../application/ports';

/** Prisma-backed {@link SessionRepository}. */
@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSessionInput): Promise<void> {
    await this.prisma.session.create({
      data: {
        id: input.id,
        userId: input.userId,
        ip: input.ip,
        ipMasked: input.ipMasked,
        userAgent: input.userAgent,
        deviceLabel: input.deviceLabel,
        amr: input.amr,
        lastSeenAt: input.lastSeenAt,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const row = await this.prisma.session.findUnique({
      where: { id },
      select: { id: true, userId: true, revokedAt: true, expiresAt: true },
    });
    return row;
  }

  async touch(id: string, lastSeenAt: Date): Promise<void> {
    await this.prisma.session.update({ where: { id }, data: { lastSeenAt } });
  }

  async revoke(id: string, when: Date): Promise<void> {
    // Only stamp the first revocation so we keep the original time.
    await this.prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: when },
    });
  }

  listActiveByUser(userId: string, now: Date): Promise<SessionListRow[]> {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      select: { id: true, deviceLabel: true, ipMasked: true, lastSeenAt: true, createdAt: true },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async revokeOwned(id: string, userId: string, when: Date): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: when },
    });
    return result.count > 0;
  }
}
