import { ReminderStatus } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { CreateReminderInput, ReminderRecord, ReminderRepository } from '../application/ports';

interface Row {
  id: string; userId: string; title: string; body: string | null; dueAt: Date;
  cadenceDays: number | null; status: string; lastFiredAt: Date | null; createdAt: Date;
}
const SELECT = {
  id: true, userId: true, title: true, body: true, dueAt: true, cadenceDays: true,
  status: true, lastFiredAt: true, createdAt: true,
} as const;
const map = (r: Row): ReminderRecord => ({ ...r, status: r.status as ReminderStatus });

@Injectable()
export class PrismaReminderRepository implements ReminderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateReminderInput): Promise<ReminderRecord> {
    return map((await this.prisma.reminder.create({ data: input, select: SELECT })) as Row);
  }
  async listByUser(userId: string): Promise<ReminderRecord[]> {
    const rows = (await this.prisma.reminder.findMany({ where: { userId }, orderBy: { dueAt: 'asc' }, select: SELECT })) as Row[];
    return rows.map(map);
  }
  async findById(id: string): Promise<ReminderRecord | null> {
    const row = (await this.prisma.reminder.findUnique({ where: { id }, select: SELECT })) as Row | null;
    return row ? map(row) : null;
  }
  async cancel(id: string): Promise<void> {
    await this.prisma.reminder.update({ where: { id }, data: { status: ReminderStatus.CANCELLED } });
  }
  async due(now: Date): Promise<ReminderRecord[]> {
    const rows = (await this.prisma.reminder.findMany({
      where: { status: ReminderStatus.SCHEDULED, dueAt: { lte: now } }, select: SELECT,
    })) as Row[];
    return rows.map(map);
  }
}
