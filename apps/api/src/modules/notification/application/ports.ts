import type { NotificationCategory, NotificationChannel, NotificationStatus, ReminderStatus } from '@dlv/shared-types';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
export const PREFERENCE_REPOSITORY = Symbol('PREFERENCE_REPOSITORY');
export const REMINDER_REPOSITORY = Symbol('REMINDER_REPOSITORY');
export const PUSH_SUBSCRIPTION_REPOSITORY = Symbol('PUSH_SUBSCRIPTION_REPOSITORY');
export const CHANNEL_SENDERS = Symbol('CHANNEL_SENDERS');

export interface NotificationRecord {
  id: string;
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  subject: string;
  body: string;
  status: NotificationStatus;
  sentAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}
export interface CreateNotificationInput {
  id: string;
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  subject: string;
  body: string;
  status: NotificationStatus;
  sentAt: Date | null;
}
export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationRecord>;
  listByUser(userId: string): Promise<NotificationRecord[]>;
  markRead(id: string, userId: string, readAt: Date): Promise<void>;
}

export interface PreferenceRecord {
  userId: string;
  category: NotificationCategory;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
}
export interface PreferenceRepository {
  listByUser(userId: string): Promise<PreferenceRecord[]>;
  upsert(input: PreferenceRecord & { id: string }): Promise<PreferenceRecord>;
}

export interface ReminderRecord {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  dueAt: Date;
  cadenceDays: number | null;
  status: ReminderStatus;
  lastFiredAt: Date | null;
  createdAt: Date;
}
export interface CreateReminderInput {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  dueAt: Date;
  cadenceDays: number | null;
}
export interface ReminderRepository {
  create(input: CreateReminderInput): Promise<ReminderRecord>;
  listByUser(userId: string): Promise<ReminderRecord[]>;
  findById(id: string): Promise<ReminderRecord | null>;
  cancel(id: string): Promise<void>;
  due(now: Date): Promise<ReminderRecord[]>;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
}
export interface PushSubscriptionRepository {
  upsert(input: { id: string; userId: string; endpoint: string; p256dh: string; auth: string }): Promise<PushSubscriptionRecord>;
  listByUser(userId: string): Promise<PushSubscriptionRecord[]>;
  deleteByEndpoint(userId: string, endpoint: string): Promise<void>;
}

/** A single delivery channel (email/SMS/WhatsApp/push). Dev impls log. */
export interface OutboundMessage {
  userId: string;
  subject: string;
  body: string;
}
export interface ChannelSender {
  readonly channel: NotificationChannel;
  /** Returns true on a successful (or successfully-queued) send. */
  send(msg: OutboundMessage): Promise<boolean>;
}
