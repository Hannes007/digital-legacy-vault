import { NotificationCategory, NotificationChannel, NotificationStatus } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { CreateNotificationInput, NotificationRecord, NotificationRepository } from '../application/ports';

interface Row {
  id: string; userId: string; category: string; channel: string; subject: string; body: string;
  status: string; sentAt: Date | null; readAt: Date | null; createdAt: Date;
}
const SELECT = {
  id: true, userId: true, category: true, channel: true, subject: true, body: true,
  status: true, sentAt: true, readAt: true, createdAt: true,
} as const;
const map = (r: Row): NotificationRecord => ({
  ...r,
  category: r.category as NotificationCategory,
  channel: r.channel as NotificationChannel,
  status: r.status as NotificationStatus,
});

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    return map((await this.prisma.notification.create({ data: input, select: SELECT })) as Row);
  }
  async listByUser(userId: string): Promise<NotificationRecord[]> {
    const rows = (await this.prisma.notification.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, take: 100, select: SELECT,
    })) as Row[];
    return rows.map(map);
  }
  async markRead(id: string, userId: string, readAt: Date): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId }, data: { status: NotificationStatus.READ, readAt },
    });
  }
}
