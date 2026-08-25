import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type {
  CreateOrgMemberInput,
  OrgMemberRecord,
  OrgMemberRole,
  OrgMemberStatus,
  OrgMemberWithUser,
  OrganisationMemberRepository,
} from '../application/org-ports';

const ADMIN_ROLES: OrgMemberRole[] = ['COMPANY_ADMIN', 'HOSPITAL_ADMIN'];

function toRecord(row: {
  id: string;
  organisationId: string;
  userId: string;
  role: string;
  status: string;
  createdAt: Date;
}): OrgMemberRecord {
  return { ...row, role: row.role as OrgMemberRole, status: row.status as OrgMemberStatus };
}

/** Prisma-backed {@link OrganisationMemberRepository}. */
@Injectable()
export class PrismaOrganisationMemberRepository implements OrganisationMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrgMemberInput): Promise<void> {
    await this.prisma.organisationMember.create({
      data: {
        id: input.id,
        organisationId: input.organisationId,
        userId: input.userId,
        role: input.role,
        status: input.status,
        invitedByUserId: input.invitedByUserId ?? null,
      },
    });
  }

  async findByOrgAndUser(organisationId: string, userId: string): Promise<OrgMemberRecord | null> {
    const row = await this.prisma.organisationMember.findUnique({
      where: { organisationId_userId: { organisationId, userId } },
      select: {
        id: true,
        organisationId: true,
        userId: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    return row ? toRecord(row) : null;
  }

  async listByUser(userId: string, statuses: OrgMemberStatus[]): Promise<OrgMemberRecord[]> {
    const rows = await this.prisma.organisationMember.findMany({
      where: { userId, status: { in: statuses } },
      select: {
        id: true,
        organisationId: true,
        userId: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    return rows.map(toRecord);
  }

  async listByOrg(organisationId: string): Promise<OrgMemberWithUser[]> {
    const rows = await this.prisma.organisationMember.findMany({
      where: { organisationId, status: { not: 'REMOVED' } },
      select: {
        id: true,
        organisationId: true,
        userId: true,
        role: true,
        status: true,
        createdAt: true,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(
      (r: {
        id: string;
        organisationId: string;
        userId: string;
        role: string;
        status: string;
        createdAt: Date;
        user: { email: string; firstName: string; lastName: string };
      }) => ({
      id: r.id,
      organisationId: r.organisationId,
      userId: r.userId,
      role: r.role as OrgMemberRole,
      status: r.status as OrgMemberStatus,
      createdAt: r.createdAt,
      email: r.user.email,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      }),
    );
  }

  async updateRole(id: string, role: OrgMemberRole): Promise<void> {
    await this.prisma.organisationMember.update({ where: { id }, data: { role } });
  }

  async updateStatus(id: string, status: OrgMemberStatus): Promise<void> {
    await this.prisma.organisationMember.update({ where: { id }, data: { status } });
  }

  countAdmins(organisationId: string): Promise<number> {
    return this.prisma.organisationMember.count({
      where: { organisationId, status: 'ACTIVE', role: { in: ADMIN_ROLES } },
    });
  }
}
