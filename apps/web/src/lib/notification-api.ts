/** Typed fetch helpers for the Notification context (Phase 6). */
import type {
  CreateReminderRequest,
  NotificationDto,
  NotificationPreferenceDto,
  PushSubscriptionRequest,
  ReminderDto,
  UpdatePreferenceRequest,
} from "@dlv/shared-types";

import { tokenStore } from "./token-store";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Notification API ${String(res.status)} on ${path}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const notificationApi = {
  list: () => req<NotificationDto[]>("/notifications"),
  markRead: (id: string) => req<void>(`/notifications/${id}/read`, { method: "POST" }),
  listPreferences: () => req<NotificationPreferenceDto[]>("/notifications/preferences"),
  updatePreference: (body: UpdatePreferenceRequest) =>
    req<NotificationPreferenceDto>("/notifications/preferences", { method: "PUT", body: JSON.stringify(body) }),
  listReminders: () => req<ReminderDto[]>("/reminders"),
  createReminder: (body: CreateReminderRequest) =>
    req<ReminderDto>("/reminders", { method: "POST", body: JSON.stringify(body) }),
  cancelReminder: (id: string) => req<void>(`/reminders/${id}`, { method: "DELETE" }),
  subscribePush: (body: PushSubscriptionRequest) =>
    req<{ subscribed: true }>("/push/subscriptions", { method: "POST", body: JSON.stringify(body) }),
};
