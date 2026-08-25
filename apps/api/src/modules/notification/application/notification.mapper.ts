import type { NotificationRecord, PreferenceRecord, ReminderRecord } from './ports';
import { isLocked } from '../domain/categories';
import type { NotificationDto, NotificationPreferenceDto, ReminderDto } from '@dlv/shared-types';

export function toNotificationDto(n: NotificationRecord): NotificationDto {
  return {
    id: n.id,
    category: n.category,
    channel: n.channel,
    subject: n.subject,
    body: n.body,
    status: n.status,
    sentAt: n.sentAt ? n.sentAt.toISOString() : null,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

export function toPreferenceDto(p: PreferenceRecord): NotificationPreferenceDto {
  return {
    category: p.category,
    email: p.email,
    sms: p.sms,
    whatsapp: p.whatsapp,
    push: p.push,
    locked: isLocked(p.category),
  };
}

export function toReminderDto(r: ReminderRecord): ReminderDto {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    dueAt: r.dueAt.toISOString(),
    cadenceDays: r.cadenceDays,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}
