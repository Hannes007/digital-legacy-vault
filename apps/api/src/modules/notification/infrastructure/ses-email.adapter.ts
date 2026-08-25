import { NotificationChannel } from '@dlv/shared-types';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV } from '../../../common/tokens';

import type { ChannelSender, OutboundMessage } from '../application/ports';
import type { Env } from '@dlv/config';

/**
 * Email channel via AWS SES (Phase 6). When SES credentials/region are wired the
 * real SendEmail call goes here; in this environment it logs (dev-log fallback,
 * mirroring the estate LoggingNotificationAdapter pattern).
 */
@Injectable()
export class SesEmailAdapter implements ChannelSender {
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger(SesEmailAdapter.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  async send(msg: OutboundMessage): Promise<boolean> {
    this.logger.log(`[email] from=${this.env.SES_FROM_EMAIL} user=${msg.userId} subject="${msg.subject}"`);
    return true;
  }
}
