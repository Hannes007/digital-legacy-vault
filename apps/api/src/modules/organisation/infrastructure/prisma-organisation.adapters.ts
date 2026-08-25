import { ClientRelationshipStatus } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { ActiveClientRelationship, ClientRelationshipReader } from '../../estate/application/ports';
import type {
  ClientRelationshipRecord,
  ClientRelationshipRepository,
  ClientRelationshipView,
  CreateClientRelationshipInput,
  OrgDirectoryPort,
  OrgMembership,
  OrgSummary,
  OrgUsagePort,
  OrgUsageSnapshot,
} from '../application/ports';
import type { EmergencyScope } from '@dlv/shared-types';

interface RelRow extends ClientRelationshipRecord {
  organisationName?: string;
  professionalName?: string;
  clientEmail?: string;
}

const OPEN_STATUSES = [ClientRelationshipStatus.PENDING, ClientRelationshipStatus.ACTIVE];

/** Prisma adapter for client relationships; doubles as the estate ABAC reader. */
@Injectable()
export class PrismaClientRelationshipRepository
  implements ClientRelationshipRepository, ClientRelationshipReader
{
  constructor(private readonly prisma: PrismaService) {}

  private async enrich(records: ClientRelationshipRecord[]): Promise<ClientRelationshipView[]> {
    const orgIds = [...new Set(records.map((r) => r.organisationId))];
    const userIds = [...new Set(records.flatMap((r) => [r.professionalUserId, r.clientUserId]))];
    const [orgs, users] = await Promise.all([
      this.prisma.organisation.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } }) as Promise<Array<{ id: string; name: string }>>,
      this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, firstName: true, lastName: true } }) as Promise<Array<{ id: string; email: string; firstName: string; lastName: string }>>,
    ]);
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    const userById = new Map(users.map((u) => [u.id, u]));
    return records.map((r) => {
      const professional = userById.get(r.professionalUserId);
      const client = userById.get(r.clientUserId);
      return {
        ...r,
        organisationName: orgName.get(r.organisationId) ?? 'Organisation',
        professionalName: professional ? `${professional.firstName} ${professional.lastName}`.trim() : 'Professional',
        clientEmail: client?.email ?? '',
      };
    });
  }

  async create(input: CreateClientRelationshipInput): Promise<ClientRelationshipRecord> {
    return (await this.prisma.clientRelationship.create({ data: input })) as ClientRelationshipRecord;
  }

  async findById(id: string): Promise<ClientRelationshipRecord | null> {
    return (await this.prisma.clientRelationship.findUnique({ where: { id } })) as ClientRelationshipRecord | null;
  }

  async listByOrg(organisationId: string): Promise<ClientRelationshipView[]> {
    const rows = (await this.prisma.clientRelationship.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
    })) as RelRow[];
    return this.enrich(rows);
  }

  async listByClient(clientUserId: string): Promise<ClientRelationshipView[]> {
    const rows = (await this.prisma.clientRelationship.findMany({
      where: { clientUserId },
      orderBy: { createdAt: 'desc' },
    })) as RelRow[];
    return this.enrich(rows);
  }

  async existsOpen(organisationId: string, professionalUserId: string, clientUserId: string): Promise<boolean> {
    const count = (await this.prisma.clientRelationship.count({
      where: { organisationId, professionalUserId, clientUserId, status: { in: OPEN_STATUSES } },
    })) as number;
    return count > 0;
  }

  async respond(
    id: string,
    status: ClientRelationshipStatus,
    scope: EmergencyScope,
    categoryIds: string[],
    respondedAt: Date,
  ): Promise<void> {
    await this.prisma.clientRelationship.update({
      where: { id },
      data: { status, scope, categoryIds, respondedAt },
    });
  }

  async revoke(id: string, revokedAt: Date): Promise<void> {
    await this.prisma.clientRelationship.update({
      where: { id },
      data: { status: ClientRelationshipStatus.REVOKED, revokedAt },
    });
  }

  /** Estate ABAC reader: the professional's ACTIVE relationships. */
  async activeForProfessional(userId: string): Promise<ActiveClientRelationship[]> {
    const rows = (await this.prisma.clientRelationship.findMany({
      where: { professionalUserId: userId, status: ClientRelationshipStatus.ACTIVE },
      select: { clientUserId: true, scope: true, categoryIds: true },
    })) as Array<{ clientUserId: string; scope: EmergencyScope; categoryIds: string[] }>;
    return rows;
  }
}

/** Cross-cutting org directory reads over identity tables (Phase 8). */
@Injectable()
export class PrismaOrgDirectoryAdapter implements OrgDirectoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findOrg(organisationId: string): Promise<OrgSummary | null> {
    return (await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { id: true, name: true, dataRegion: true },
    })) as OrgSummary | null;
  }

  async membership(organisationId: string, userId: string): Promise<OrgMembership | null> {
    return (await this.prisma.organisationMember.findUnique({
      where: { organisationId_userId: { organisationId, userId } },
      select: { role: true, status: true },
    })) as OrgMembership | null;
  }

  async findUserIdByEmail(email: string): Promise<string | null> {
    const user = (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) as
      | { id: string }
      | null;
    return user?.id ?? null;
  }

  async updateDataRegion(organisationId: string, dataRegion: string): Promise<void> {
    await this.prisma.organisation.update({ where: { id: organisationId }, data: { dataRegion } });
  }
}

/** Org usage metering read model (Phase 8) — feeds org billing. */
@Injectable()
export class PrismaOrgUsageAdapter implements OrgUsagePort {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(organisationId: string, monthStart: Date): Promise<OrgUsageSnapshot> {
    const members = (await this.prisma.organisationMember.findMany({
      where: { organisationId },
      select: { userId: true, status: true },
    })) as Array<{ userId: string; status: string }>;
    const activeIds = members.filter((m) => m.status === 'ACTIVE').map((m) => m.userId);

    const [documents, storageAgg, signaturesThisMonth, aiRequestsThisMonth, activeClientRelationships] =
      await Promise.all([
        this.prisma.document.count({ where: { ownerId: { in: activeIds } } }),
        this.prisma.documentVersion.aggregate({
          _sum: { sizeBytes: true },
          where: { document: { ownerId: { in: activeIds } } },
        }),
        this.prisma.signature.count({
          where: { signerUserId: { in: activeIds }, createdAt: { gte: monthStart } },
        }),
        this.prisma.aiUsage.count({
          where: { userId: { in: activeIds }, createdAt: { gte: monthStart } },
        }),
        this.prisma.clientRelationship.count({
          where: { organisationId, status: ClientRelationshipStatus.ACTIVE },
        }),
      ]);
    const sum = (storageAgg as { _sum?: { sizeBytes?: bigint | null } })?._sum?.sizeBytes;
    return {
      seats: members.length,
      activeMembers: activeIds.length,
      documents: Number(documents),
      storageBytes: sum ? Number(sum) : 0,
      signaturesThisMonth: Number(signaturesThisMonth),
      aiRequestsThisMonth: Number(aiRequestsThisMonth),
      activeClientRelationships: Number(activeClientRelationships),
    };
  }
}
