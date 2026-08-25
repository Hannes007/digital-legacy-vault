import { Injectable } from '@nestjs/common';
import { DeathVerificationStatus } from '@dlv/shared-types';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { DeathVerificationRecord, DeathVerificationRepository } from '../application/ports';

interface Row {
  id: string; subjectUserId: string; claimantId: string; evidenceDocIds: string[];
  status: string; reviewerId: string | null; reviewNotes: string | null; createdAt: Date;
}
const SELECT = { id: true, subjectUserId: true, claimantId: true, evidenceDocIds: true, status: true, reviewerId: true, reviewNotes: true, createdAt: true } as const;
const map = (r: Row): DeathVerificationRecord => ({ ...r, status: r.status as DeathVerificationStatus });

@Injectable()
export class PrismaDeathVerificationRepository implements DeathVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(input: { id: string; subjectUserId: string; claimantId: string; evidenceDocIds: string[] }): Promise<DeathVerificationRecord> {
    return map((await this.prisma.deathVerification.create({ data: input, select: SELECT })) as Row);
  }
  async findById(id: string): Promise<DeathVerificationRecord | null> {
    const r = (await this.prisma.deathVerification.findUnique({ where: { id }, select: SELECT })) as Row | null;
    return r ? map(r) : null;
  }
  async listByStatus(status: DeathVerificationStatus): Promise<DeathVerificationRecord[]> {
    return ((await this.prisma.deathVerification.findMany({ where: { status }, orderBy: { createdAt: 'asc' }, select: SELECT })) as Row[]).map(map);
  }
  async setDecision(id: string, status: DeathVerificationStatus, reviewerId: string, notes: string | null): Promise<void> {
    await this.prisma.deathVerification.update({ where: { id }, data: { status, reviewerId, reviewNotes: notes, decidedAt: new Date() } });
  }
}
