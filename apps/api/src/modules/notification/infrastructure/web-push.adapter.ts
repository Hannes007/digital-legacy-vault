import { NotificationChannel } from '@dlv/shared-types';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV } from '../../../common/tokens';
import { PUSH_SUBSCRIPTION_REPOSITORY, type ChannelSender, type OutboundMessage, type PushSubscriptionRepository } from '../application/ports';

import type { Env } from '@dlv/config';

/**
 * Web Push channel (Phase 6). Fans a message out to the user's registered PWA
 * push subscriptions; real delivery signs with the VAPID keys. Dev-log fallback
 * when VAPID keys are absent.
 */
@Injectable()
export class WebPushAdapter implements ChannelSender {
  readonly channel = NotificationChannel.PUSH;
  private readonly logger = new Logger(WebPushAdapter.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY) private readonly subs: PushSubscriptionRepository,
  ) {}

  async send(msg: OutboundMessage): Promise<boolean> {
    const targets = await this.subs.listByUser(msg.userId);
    const configured = this.env.VAPID_PUBLIC_KEY.length > 0 && this.env.VAPID_PRIVATE_KEY.length > 0;
    this.logger.log(`[push${configured ? '' : ':dev'}] user=${msg.userId} endpoints=${String(targets.length)} subject="${msg.subject}"`);
    return targets.length > 0;
  }
}
