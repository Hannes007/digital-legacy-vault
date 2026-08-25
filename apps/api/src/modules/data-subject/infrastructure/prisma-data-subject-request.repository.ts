import { DataSubjectRequestStatus, DataSubjectRequestType } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { DataSubjectRequestRecord, DataSubjectRequestRepository } from '../application/ports';

interface Row {
  id: string;
  userId: string;
  type: string;
  status: string;
  detail: string | null;
  requestedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

const SELECT = {
  id: true,
  userId: true,
  type: true,
  status: true,
  detail: true,
  requestedAt: true,
  completedAt: true,
  createdAt: true,
} as const;

const map = (r: Row): DataSubjectRequestRecord => ({
  ...r,
  type: r.type as DataSubjectRequestType,
  status: r.status as DataSubjectRequestStatus,
});

@Injectable()
export class PrismaDataSubjectRequestRepository implements DataSubjectRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    id: string;
    userId: string;
    type: DataSubjectRequestType;
    requestedAt: Date;
  }): Promise<DataSubjectRequestRecord> {
    return map((await this.prisma.dataSubjectRequest.create({ data: input, select: SELECT })) as Row);
  }

  async complete(
    id: string,
    status: DataSubjectRequestStatus,
    detail: string | null,
    completedAt: Date,
  ): Promise<void> {
    await this.prisma.dataSubjectRequest.update({ where: { id }, data: { status, detail, completedAt } });
  }

  async listByUser(userId: string): Promise<DataSubjectRequestRecord[]> {
    const rows = (await this.prisma.dataSubjectRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    })) as Row[];
    return rows.map(map);
  }
}
