import { ConsentPurpose, ConsentStatus } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { ConsentRecord, ConsentRepository, CreateConsentInput } from '../application/ports';

interface Row {
  id: string;
  userId: string;
  purpose: string;
  status: string;
  statementText: string;
  statementVersion: string;
  sourceContext: string | null;
  ipMasked: string | null;
  userAgent: string | null;
  grantedAt: Date;
  withdrawnAt: Date | null;
  createdAt: Date;
}

const SELECT = {
  id: true,
  userId: true,
  purpose: true,
  status: true,
  statementText: true,
  statementVersion: true,
  sourceContext: true,
  ipMasked: true,
  userAgent: true,
  grantedAt: true,
  withdrawnAt: true,
  createdAt: true,
} as const;

const map = (r: Row): ConsentRecord => ({
  ...r,
  purpose: r.purpose as ConsentPurpose,
  status: r.status as ConsentStatus,
});

@Injectable()
export class PrismaConsentRepository implements ConsentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateConsentInput): Promise<ConsentRecord> {
    return map((await this.prisma.consent.create({ data: input, select: SELECT })) as Row);
  }

  async findById(id: string): Promise<ConsentRecord | null> {
    const row = (await this.prisma.consent.findUnique({ where: { id }, select: SELECT })) as Row | null;
    return row ? map(row) : null;
  }

  async listByUser(userId: string): Promise<ConsentRecord[]> {
    const rows = (await this.prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    })) as Row[];
    return rows.map(map);
  }

  async withdraw(id: string, withdrawnAt: Date): Promise<void> {
    await this.prisma.consent.update({
      where: { id },
      data: { status: ConsentStatus.WITHDRAWN, withdrawnAt },
    });
  }
}
