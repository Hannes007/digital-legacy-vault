import { type PushSubscriptionRequest } from '@dlv/shared-types';
import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { PUSH_SUBSCRIPTION_REPOSITORY, type PushSubscriptionRepository } from './ports';

/** Web Push subscription management for the PWA (Phase 6). */
@Injectable()
export class PushService {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY) private readonly subs: PushSubscriptionRepository,
  ) {}

  async subscribe(userId: string, req: PushSubscriptionRequest): Promise<{ subscribed: true }> {
    await this.subs.upsert({ id: uuidv7(), userId, endpoint: req.endpoint, p256dh: req.p256dh, auth: req.auth });
    return { subscribed: true };
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.subs.deleteByEndpoint(userId, endpoint);
  }
}
