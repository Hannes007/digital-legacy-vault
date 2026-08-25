import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_NAMES, type NotificationJob } from '../queues';

/**
 * Delivers a notification over the requested channel (SES/Twilio/web push).
 * Stubbed to log; provider integrations land in Phase 6 (notification context).
 */
@Processor(QUEUE_NAMES.notification)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  process(job: Job<NotificationJob>): Promise<{ sent: boolean }> {
    const { channel, to, template } = job.data;
    this.logger.log(`sending ${channel} '${template}' to ${to}`);
    return Promise.resolve({ sent: true });
  }
}
