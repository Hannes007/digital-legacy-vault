import { LegalHoldScope, LegalHoldStatus } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type {
  CreateLegalHoldInput,
  LegalHoldRecord,
  LegalHoldRepository,
  ScopeRef,
} from '../application/ports';

interface Row {
  id: string;
  scopeType: string;
  scopeId: string;
  reason: string;
  reference: string | null;
  status: string;
  placedByUserId: string;
  placedAt: Date;
  releasedByUserId: string | null;
  releasedAt: Date | null;
  createdAt: Date;
}

const SELECT = {
  id: true,
  scopeType: true,
  scopeId: true,
  reason: true,
  reference: true,
  status: true,
  placedByUserId: true,
  placedAt: true,
  releasedByUserId: true,
  releasedAt: true,
  createdAt: true,
} as const;

const map = (r: Row): LegalHoldRecord => ({
  ...r,
  scopeType: r.scopeType as LegalHoldScope,
  status: r.status as LegalHoldStatus,
});

@Injectable()
export class PrismaLegalHoldRepository implements LegalHoldRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateLegalHoldInput): Promise<LegalHoldRecord> {
    return map((await this.prisma.legalHold.create({ data: input, select: SELECT })) as Row);
  }

  async findById(id: string): Promise<LegalHoldRecord | null> {
    const row = (await this.prisma.legalHold.findUnique({ where: { id }, select: SELECT })) as Row | null;
    return row ? map(row) : null;
  }

  async list(filter: { status?: LegalHoldStatus }): Promise<LegalHoldRecord[]> {
    const rows = (await this.prisma.legalHold.findMany({
      where: filter.status ? { status: filter.status } : {},
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    })) as Row[];
    return rows.map(map);
  }

  async findActiveByScopes(scopes: ScopeRef[]): Promise<LegalHoldRecord[]> {
    if (scopes.length === 0) return [];
    const rows = (await this.prisma.legalHold.findMany({
      where: {
        status: LegalHoldStatus.ACTIVE,
        OR: scopes.map((s) => ({ scopeType: s.scopeType, scopeId: s.scopeId })),
      },
      select: SELECT,
    })) as Row[];
    return rows.map(map);
  }

  async release(id: string, releasedByUserId: string, releasedAt: Date): Promise<void> {
    await this.prisma.legalHold.update({
      where: { id },
      data: { status: LegalHoldStatus.RELEASED, releasedByUserId, releasedAt },
    });
  }
}
