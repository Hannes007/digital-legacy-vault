import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type {
  AiInsightRecord,
  AiInsightRepository,
  AiPreferenceRecord,
  AiPreferenceRepository,
  AiUsageRepository,
  CreateInsightInput,
  RecordUsageInput,
} from '../application/ports';

/** Prisma adapter for stored AI insights (Phase 7). */
@Injectable()
export class PrismaAiInsightRepository implements AiInsightRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInsightInput): Promise<AiInsightRecord> {
    return (await this.prisma.aiInsight.create({ data: input })) as AiInsightRecord;
  }

  async latestForDocument(documentId: string): Promise<AiInsightRecord | null> {
    return (await this.prisma.aiInsight.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    })) as AiInsightRecord | null;
  }

  async countDistinctDocumentsSince(ownerId: string, since: Date): Promise<number> {
    const groups = (await this.prisma.aiInsight.groupBy({
      by: ['documentId'],
      where: { ownerId, createdAt: { gte: since } },
    })) as unknown[];
    return groups.length;
  }

  async hasInsightForDocumentSince(documentId: string, since: Date): Promise<boolean> {
    const count = (await this.prisma.aiInsight.count({
      where: { documentId, createdAt: { gte: since } },
    })) as number;
    return count > 0;
  }
}

/** Prisma adapter for AI telemetry rows (cost budgets, Phase 7 exit). */
@Injectable()
export class PrismaAiUsageRepository implements AiUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordUsageInput & { id: string }): Promise<void> {
    await this.prisma.aiUsage.create({ data: input });
  }

  async countRequestsSince(userId: string, since: Date): Promise<number> {
    return Number(await this.prisma.aiUsage.count({ where: { userId, createdAt: { gte: since } } }));
  }

  async sumCostMicroUsdSince(userId: string, since: Date): Promise<number> {
    const agg = (await this.prisma.aiUsage.aggregate({
      _sum: { costMicroUsd: true },
      where: { userId, createdAt: { gte: since } },
    })) as { _sum: { costMicroUsd: number | null } };
    return agg._sum.costMicroUsd ?? 0;
  }
}

/** Prisma adapter for the per-user AI preference (opt-out). */
@Injectable()
export class PrismaAiPreferenceRepository implements AiPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(userId: string): Promise<AiPreferenceRecord | null> {
    return (await this.prisma.aiPreference.findUnique({
      where: { userId },
    })) as AiPreferenceRecord | null;
  }

  async upsert(userId: string, aiEnabled: boolean): Promise<AiPreferenceRecord> {
    return (await this.prisma.aiPreference.upsert({
      where: { userId },
      create: { userId, aiEnabled },
      update: { aiEnabled },
    })) as AiPreferenceRecord;
  }
}
