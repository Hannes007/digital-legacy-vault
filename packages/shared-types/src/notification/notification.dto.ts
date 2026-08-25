import type {
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  ReminderStatus,
} from '../common/notification-enums.js';

export interface NotificationDto {
  id: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  subject: string;
  body: string;
  status: NotificationStatus;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Per-category channel preferences. Non-disableable categories ignore attempts to turn all off. */
export interface NotificationPreferenceDto {
  category: NotificationCategory;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  /** True for SECURITY / EMERGENCY_ACCESS — at least email stays on. */
  locked: boolean;
}

export interface UpdatePreferenceRequest {
  category: NotificationCategory;
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
  push?: boolean;
}

export interface ReminderDto {
  id: string;
  title: string;
  body: string | null;
  dueAt: string;
  cadenceDays: number | null;
  status: ReminderStatus;
  createdAt: string;
}

export interface CreateReminderRequest {
  title: string;
  body?: string;
  dueAt: string;
  cadenceDays?: number;
}

/** Browser Web Push subscription payload. */
export interface PushSubscriptionRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
}
