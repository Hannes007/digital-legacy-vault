import {
  NotificationChannel,
  NotificationStatus,
  type NotificationCategory,
  type NotificationDto,
} from '@dlv/shared-types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK } from '../../../common/tokens';

import { toNotificationDto } from './notification.mapper';
import { PreferenceService } from './preference.service';
import {
  CHANNEL_SENDERS,
  NOTIFICATION_REPOSITORY,
  type ChannelSender,
  type NotificationRepository,
} from './ports';

import type { Clock } from '../../../common/time/clock';
import type { ChannelPrefs } from '../domain/categories';

export interface SendNotificationInput {
  userId: string;
  category: NotificationCategory;
  subject: string;
  body: string;
}

/**
 * Multi-channel notification dispatcher (Phase 6). Resolves the user's
 * per-category preferences, honours the non-disableable rule (security /
 * emergency always reach email), fans out to each enabled channel's sender, and
 * persists one Notification row per channel with its delivery status.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly byChannel: Map<NotificationChannel, ChannelSender>;

  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(CHANNEL_SENDERS) senders: ChannelSender[],
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly preferences: PreferenceService,
  ) {
    this.byChannel = new Map(senders.map((s) => [s.channel, s]));
  }

  async send(input: SendNotificationInput): Promise<NotificationDto[]> {
    const prefs = await this.preferences.resolve(input.userId, input.category);
    const channels = this.enabledChannels(prefs);
    const created: NotificationDto[] = [];

    for (const channel of channels) {
      const sender = this.byChannel.get(channel);
      let ok = false;
      if (sender) {
        try {
          ok = await sender.send({ userId: input.userId, subject: input.subject, body: input.body });
        } catch (err) {
          this.logger.warn(`Channel ${channel} failed for ${input.userId}: ${String(err)}`);
        }
      }
      const rec = await this.notifications.create({
        id: uuidv7(),
        userId: input.userId,
        category: input.category,
        channel,
        subject: input.subject,
        body: input.body,
        status: ok ? NotificationStatus.SENT : NotificationStatus.FAILED,
        sentAt: ok ? this.clock.now() : null,
      });
      created.push(toNotificationDto(rec));
    }
    return created;
  }

  async list(userId: string): Promise<NotificationDto[]> {
    const recs = await this.notifications.listByUser(userId);
    return recs.map(toNotificationDto);
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.notifications.markRead(id, userId, this.clock.now());
  }

  private enabledChannels(prefs: ChannelPrefs): NotificationChannel[] {
    const out: NotificationChannel[] = [];
    if (prefs.email) out.push(NotificationChannel.EMAIL);
    if (prefs.sms) out.push(NotificationChannel.SMS);
    if (prefs.whatsapp) out.push(NotificationChannel.WHATSAPP);
    if (prefs.push) out.push(NotificationChannel.PUSH);
    return out;
  }
}
