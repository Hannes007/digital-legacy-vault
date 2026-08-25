import { NotificationCategory } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { PreferenceRecord, PreferenceRepository } from '../application/ports';

interface Row {
  userId: string; category: string; email: boolean; sms: boolean; whatsapp: boolean; push: boolean;
}
const SELECT = { userId: true, category: true, email: true, sms: true, whatsapp: true, push: true } as const;
const map = (r: Row): PreferenceRecord => ({ ...r, category: r.category as NotificationCategory });

@Injectable()
export class PrismaPreferenceRepository implements PreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: string): Promise<PreferenceRecord[]> {
    const rows = (await this.prisma.notificationPreference.findMany({ where: { userId }, select: SELECT })) as Row[];
    return rows.map(map);
  }

  async upsert(input: PreferenceRecord & { id: string }): Promise<PreferenceRecord> {
    const { id, userId, category, email, sms, whatsapp, push } = input;
    const row = (await this.prisma.notificationPreference.upsert({
      where: { userId_category: { userId, category } },
      create: { id, userId, category, email, sms, whatsapp, push },
      update: { email, sms, whatsapp, push },
      select: SELECT,
    })) as Row;
    return map(row);
  }
}
