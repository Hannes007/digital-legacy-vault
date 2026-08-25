import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { AuditSearchFilter, AdminRepository } from '../application/ports';
import type { AuditSearchResultDto, UserSupportSummaryDto } from '@dlv/shared-types';

interface AuditRow {
  id: string;
  occurredAt: Date;
  actorUserId: string | null;
  eventType: string;
  resource: string;
  ipMasked: string | null;
}

@Injectable()
export class PrismaAdminRepository implements AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchAudit(filter: AuditSearchFilter): Promise<AuditSearchResultDto> {
    const where: Record<string, unknown> = {};
    if (filter.actorUserId) where.actorUserId = filter.actorUserId;
    if (filter.eventType) where.eventType = { contains: filter.eventType, mode: 'insensitive' };
    if (filter.resource) where.resource = { contains: filter.resource, mode: 'insensitive' };
    if (filter.from || filter.to) {
      where.occurredAt = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }
    const rows = (await this.prisma.auditEvent.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: filter.limit + 1,
      select: { id: true, occurredAt: true, actorUserId: true, eventType: true, resource: true, ipMasked: true },
    })) as AuditRow[];
    const truncated = rows.length > filter.limit;
    const events = rows.slice(0, filter.limit).map((r) => ({
      id: r.id,
      occurredAt: r.occurredAt.toISOString(),
      actorUserId: r.actorUserId,
      eventType: r.eventType,
      resource: r.resource,
      ipMasked: r.ipMasked,
    }));
    return { events, truncated };
  }

  async userSummary(userId: string): Promise<UserSupportSummaryDto | null> {
    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true, status: true, createdAt: true,
        roles: { select: { role: true } },
      },
    })) as
      | { id: string; email: string; firstName: string; lastName: string; status: string; createdAt: Date; roles: { role: string }[] }
      | null;
    if (!user) return null;

    const [subscription, documents, vaults, signaturesTotal] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { userId }, select: { tier: true, status: true } }),
      this.prisma.document.count({ where: { ownerId: userId } }),
      this.prisma.vault.count({ where: { ownerId: userId } }),
      this.prisma.signature.count({ where: { signerUserId: userId } }),
    ]);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: user.roles.map((r: { role: string }) => r.role),
      createdAt: user.createdAt.toISOString(),
      subscription: subscription
        ? { tier: String((subscription as { tier: string }).tier), status: String((subscription as { status: string }).status) }
        : null,
      usage: { documents: Number(documents), vaults: Number(vaults), signaturesTotal: Number(signaturesTotal) },
    };
  }
}
