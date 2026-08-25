import { BillingCurrency, BillingInterval, PlanTier, SubscriptionStatus } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { SubscriptionRecord, SubscriptionRepository, UpsertSubscriptionInput } from '../application/ports';

interface Row {
  id: string;
  userId: string;
  tier: string;
  status: string;
  interval: string;
  currency: string;
  seats: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SELECT = {
  id: true, userId: true, tier: true, status: true, interval: true, currency: true, seats: true,
  stripeCustomerId: true, stripeSubscriptionId: true, currentPeriodEnd: true, cancelAtPeriodEnd: true,
  graceUntil: true, createdAt: true, updatedAt: true,
} as const;

const map = (r: Row): SubscriptionRecord => ({
  ...r,
  tier: r.tier as PlanTier,
  status: r.status as SubscriptionStatus,
  interval: r.interval as BillingInterval,
  currency: r.currency as BillingCurrency,
});

@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string): Promise<SubscriptionRecord | null> {
    const row = (await this.prisma.subscription.findUnique({ where: { userId }, select: SELECT })) as Row | null;
    return row ? map(row) : null;
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<SubscriptionRecord | null> {
    const row = (await this.prisma.subscription.findFirst({ where: { stripeCustomerId }, select: SELECT })) as Row | null;
    return row ? map(row) : null;
  }

  async upsert(input: UpsertSubscriptionInput): Promise<SubscriptionRecord> {
    const { id, userId, ...rest } = input;
    const row = (await this.prisma.subscription.upsert({
      where: { userId },
      create: { id, userId, ...rest },
      update: rest,
      select: SELECT,
    })) as Row;
    return map(row);
  }
}
