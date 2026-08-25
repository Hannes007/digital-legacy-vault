import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { PushSubscriptionRecord, PushSubscriptionRepository } from '../application/ports';

interface Row { id: string; userId: string; endpoint: string; p256dh: string; auth: string; createdAt: Date; }
const SELECT = { id: true, userId: true, endpoint: true, p256dh: true, auth: true, createdAt: true } as const;

@Injectable()
export class PrismaPushSubscriptionRepository implements PushSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(input: { id: string; userId: string; endpoint: string; p256dh: string; auth: string }): Promise<PushSubscriptionRecord> {
    return (await this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: input,
      update: { userId: input.userId, p256dh: input.p256dh, auth: input.auth },
      select: SELECT,
    })) as PushSubscriptionRecord;
  }
  async listByUser(userId: string): Promise<PushSubscriptionRecord[]> {
    return (await this.prisma.pushSubscription.findMany({ where: { userId }, select: SELECT })) as PushSubscriptionRecord[];
  }
  async deleteByEndpoint(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }
}
