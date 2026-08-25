import { Injectable, Logger } from '@nestjs/common';

import type { NotificationPort } from '../application/ports';

/**
 * Dev/stub owner-notification adapter — logs the alert. Real SES/Twilio/web-push
 * delivery lands in the Phase 6 notification context; emergency alerts are
 * non-disableable there (§7.6).
 */
@Injectable()
export class LoggingNotificationAdapter implements NotificationPort {
  private readonly logger = new Logger('OwnerNotification');

  notifyOwner(ownerId: string, kind: string, payload: Record<string, unknown>): Promise<void> {
    this.logger.warn(`[${kind}] owner=${ownerId} ${JSON.stringify(payload)}`);
    return Promise.resolve();
  }
}
