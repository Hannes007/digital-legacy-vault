import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type {
  CreateOrganisationInput,
  OrgType,
  OrganisationRecord,
  OrganisationRepository,
} from '../application/org-ports';

function toRecord(row: {
  id: string;
  name: string;
  orgType: string;
  billingEmail: string;
  verificationStatus: string;
  createdAt: Date;
}): OrganisationRecord {
  return { ...row, orgType: row.orgType as OrgType };
}

const SELECT = {
  id: true,
  name: true,
  orgType: true,
  billingEmail: true,
  verificationStatus: true,
  createdAt: true,
} as const;

/** Prisma-backed {@link OrganisationRepository}. */
@Injectable()
export class PrismaOrganisationRepository implements OrganisationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrganisationInput): Promise<OrganisationRecord> {
    const row = await this.prisma.organisation.create({
      data: {
        id: input.id,
        name: input.name,
        orgType: input.orgType,
        billingEmail: input.billingEmail,
      },
      select: SELECT,
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<OrganisationRecord | null> {
    const row = await this.prisma.organisation.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });
    return row ? toRecord(row) : null;
  }

  async update(id: string, data: { name?: string; billingEmail?: string }): Promise<void> {
    await this.prisma.organisation.update({ where: { id }, data });
  }

  async listByIds(ids: string[]): Promise<OrganisationRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.organisation.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: SELECT,
    });
    return rows.map(toRecord);
  }
}
