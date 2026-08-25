"use client";

import { Bell, BellRing, Lock, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  NotificationChannel,
  type NotificationPreferenceDto,
  type ReminderDto,
  type UpdatePreferenceRequest,
} from "@dlv/shared-types";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { notificationApi } from "@/lib/notification-api";

const CHANNELS: Array<{ key: keyof Omit<UpdatePreferenceRequest, "category">; label: string }> = [
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "push", label: "Push" },
];

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferenceDto[]>([]);
  const [reminders, setReminders] = useState<ReminderDto[]>([]);
  const [pushState, setPushState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rTitle, setRTitle] = useState("");
  const [rDue, setRDue] = useState("");

  const reload = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([notificationApi.listPreferences(), notificationApi.listReminders()]);
      setPrefs(p);
      setReminders(r);
    } catch {
      setError("We couldn’t load your notification settings.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function toggle(pref: NotificationPreferenceDto, key: keyof Omit<UpdatePreferenceRequest, "category">) {
    const next = { category: pref.category, [key]: !pref[key] } as UpdatePreferenceRequest;
    try {
      const updated = await notificationApi.updatePreference(next);
      setPrefs((prev) => prev.map((p) => (p.category === updated.category ? updated : p)));
    } catch {
      setError("Could not update that preference.");
    }
  }

  async function enablePush() {
    setError(null);
    setPushState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        ...(key ? { applicationServerKey: key } : {}),
      });
      const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      await notificationApi.subscribePush({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      setPushState("enabled");
    } catch {
      setPushState(null);
      setError("Push isn’t available in this browser, or permission was denied.");
    }
  }

  async function addReminder() {
    if (!rTitle || !rDue) return;
    try {
      await notificationApi.createReminder({ title: rTitle, dueAt: new Date(rDue).toISOString() });
      setRTitle("");
      setRDue("");
      await reload();
    } catch {
      setError("Could not create the reminder.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-semibold text-fg">Notifications</h1>
        <p className="text-body text-fg-secondary">Choose how we reach you. Security and emergency alerts always reach your email.</p>
      </div>

      {error ? <Alert variant="danger" title="Something went wrong">{error}</Alert> : null}

      <Card>
        <CardHeader title="Channels by category" />
        <CardBody className="flex flex-col gap-2">
          {prefs.map((pref) => (
            <div key={pref.category} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
              <span className="flex items-center gap-2 text-body font-medium text-fg">
                {pref.category.replaceAll("_", " ")}
                {pref.locked ? <Badge><Lock size={12} /> Always on</Badge> : null}
              </span>
              <div className="flex flex-wrap gap-3">
                {CHANNELS.map((c) => {
                  const disabled = pref.locked && c.key === "email";
                  return (
                    <label key={c.key} className="flex items-center gap-1.5 text-body-sm text-fg-secondary">
                      <input
                        type="checkbox"
                        checked={pref[c.key]}
                        disabled={disabled}
                        onChange={() => void toggle(pref, c.key)}
                        className="h-4 w-4"
                      />
                      {c.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Push notifications" />
        <CardBody className="flex items-center justify-between gap-3">
          <p className="text-body-sm text-fg-secondary">Enable browser push for reminders and alerts on this device.</p>
          <Button
            icon={pushState === "enabled" ? <BellRing size={16} /> : <Bell size={16} />}
            variant="secondary"
            onClick={() => void enablePush()}
            loading={pushState === "working"}
          >
            {pushState === "enabled" ? "Push enabled" : "Enable push"}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Reminders" />
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Input label="Title" value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="Review my will" />
            <Input label="When" type="date" value={rDue} onChange={(e) => setRDue(e.target.value)} />
            <Button icon={<Plus size={16} />} onClick={() => void addReminder()} disabled={!rTitle || !rDue}>
              Add
            </Button>
          </div>
          {reminders.length === 0 ? (
            <p className="text-body-sm text-fg-muted">No reminders yet.</p>
          ) : (
            reminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <span className="text-body-sm text-fg">
                  {r.title} · <span className="text-fg-muted">{new Date(r.dueAt).toLocaleDateString()}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "SCHEDULED" ? "neutral" : "success"}>{r.status}</Badge>
                  {r.status === "SCHEDULED" ? (
                    <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => void notificationApi.cancelReminder(r.id).then(reload)}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
