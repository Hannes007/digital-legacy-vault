import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';

import { NotificationService } from './application/notification.service';
import { PreferenceService } from './application/preference.service';
import {
  CHANNEL_SENDERS,
  NOTIFICATION_REPOSITORY,
  PREFERENCE_REPOSITORY,
  PUSH_SUBSCRIPTION_REPOSITORY,
  REMINDER_REPOSITORY,
} from './application/ports';
import { PushService } from './application/push.service';
import { ReminderService } from './application/reminder.service';
import { PrismaNotificationRepository } from './infrastructure/prisma-notification.repository';
import { PrismaPreferenceRepository } from './infrastructure/prisma-preference.repository';
import { PrismaPushSubscriptionRepository } from './infrastructure/prisma-push-subscription.repository';
import { PrismaReminderRepository } from './infrastructure/prisma-reminder.repository';
import { SesEmailAdapter } from './infrastructure/ses-email.adapter';
import { TwilioSmsAdapter } from './infrastructure/twilio-sms.adapter';
import { TwilioWhatsappAdapter } from './infrastructure/twilio-whatsapp.adapter';
import { WebPushAdapter } from './infrastructure/web-push.adapter';
import { NotificationsController } from './presentation/notifications.controller';
import { PushController } from './presentation/push.controller';
import { RemindersController } from './presentation/reminders.controller';

/**
 * Notification bounded context (Phase 6). Multi-channel fabric — email (SES),
 * SMS + WhatsApp (Twilio), web push — with per-category preferences (security /
 * emergency non-disableable), reminders, and push subscriptions. Channel
 * adapters are dev-log with real-provider config seams. Exports NotificationService
 * so other contexts can send notifications.
 */
@Module({
  imports: [AuditModule, IdentityModule],
  controllers: [NotificationsController, RemindersController, PushController],
  providers: [
    NotificationService,
    PreferenceService,
    ReminderService,
    PushService,
    SesEmailAdapter,
    TwilioSmsAdapter,
    TwilioWhatsappAdapter,
    WebPushAdapter,
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    { provide: PREFERENCE_REPOSITORY, useClass: PrismaPreferenceRepository },
    { provide: REMINDER_REPOSITORY, useClass: PrismaReminderRepository },
    { provide: PUSH_SUBSCRIPTION_REPOSITORY, useClass: PrismaPushSubscriptionRepository },
    {
      provide: CHANNEL_SENDERS,
      useFactory: (
        email: SesEmailAdapter,
        sms: TwilioSmsAdapter,
        whatsapp: TwilioWhatsappAdapter,
        push: WebPushAdapter,
      ) => [email, sms, whatsapp, push],
      inject: [SesEmailAdapter, TwilioSmsAdapter, TwilioWhatsappAdapter, WebPushAdapter],
    },
  ],
  exports: [NotificationService, ReminderService],
})
export class NotificationModule {}
