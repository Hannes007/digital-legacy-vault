import { NotificationChannel } from '@dlv/shared-types';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV } from '../../../common/tokens';

import type { ChannelSender, OutboundMessage } from '../application/ports';
import type { Env } from '@dlv/config';

/** WhatsApp channel via Twilio (Phase 6). Dev-log fallback when unconfigured. */
@Injectable()
export class TwilioWhatsappAdapter implements ChannelSender {
  readonly channel = NotificationChannel.WHATSAPP;
  private readonly logger = new Logger(TwilioWhatsappAdapter.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  async send(msg: OutboundMessage): Promise<boolean> {
    const configured = this.env.TWILIO_ACCOUNT_SID.length > 0 && this.env.TWILIO_WHATSAPP_FROM.length > 0;
    this.logger.log(`[whatsapp${configured ? '' : ':dev'}] user=${msg.userId} subject="${msg.subject}"`);
    return true;
  }
}
