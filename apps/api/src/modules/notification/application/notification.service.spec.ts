import { NotificationCategory, NotificationChannel, NotificationStatus } from '@dlv/shared-types';

import { NotificationService } from './notification.service';
import { PreferenceService } from './preference.service';

import type {
  ChannelSender,
  CreateNotificationInput,
  NotificationRecord,
  NotificationRepository,
  OutboundMessage,
  PreferenceRecord,
  PreferenceRepository,
} from './ports';
import type { Clock } from '../../../common/time/clock';

const clock: Clock = { now: () => new Date('2026-07-16T10:00:00Z') };

function prefRepo(seed: PreferenceRecord[] = []) {
  const store = [...seed];
  const repo: PreferenceRepository = {
    listByUser: async (userId) => store.filter((p) => p.userId === userId),
    upsert: async (input) => {
      const idx = store.findIndex((p) => p.userId === input.userId && p.category === input.category);
      const rec: PreferenceRecord = { userId: input.userId, category: input.category, email: input.email, sms: input.sms, whatsapp: input.whatsapp, push: input.push };
      if (idx >= 0) store[idx] = rec; else store.push(rec);
      return rec;
    },
  };
  return { repo, store };
}

function notifRepo() {
  const store: NotificationRecord[] = [];
  const repo: NotificationRepository = {
    create: async (i: CreateNotificationInput) => {
      const rec: NotificationRecord = { ...i, readAt: null, createdAt: new Date() };
      store.push(rec);
      return rec;
    },
    listByUser: async () => store,
    markRead: async () => undefined,
  };
  return { repo, store };
}

function sender(channel: NotificationChannel, ok = true): ChannelSender {
  return { channel, send: async (_m: OutboundMessage) => ok };
}

const allSenders = [
  sender(NotificationChannel.EMAIL),
  sender(NotificationChannel.SMS),
  sender(NotificationChannel.WHATSAPP),
  sender(NotificationChannel.PUSH),
];

describe('NotificationService + PreferenceService', () => {
  it('fans a SECURITY notification out to its default channels', async () => {
    const prefs = new PreferenceService(prefRepo().repo);
    const { repo: nrepo, store } = notifRepo();
    const svc = new NotificationService(nrepo, allSenders, clock, prefs);

    const created = await svc.send({ userId: 'u1', category: NotificationCategory.SECURITY, subject: 'New login', body: '...' });
    const channels = created.map((c) => c.channel).sort();
    expect(channels).toContain(NotificationChannel.EMAIL);
    expect(channels).toContain(NotificationChannel.PUSH);
    expect(store.every((n) => n.status === NotificationStatus.SENT)).toBe(true);
  });

  it('keeps email on for a non-disableable category even if the user turns it off', async () => {
    const { repo } = prefRepo();
    const prefs = new PreferenceService(repo);
    const updated = await prefs.update('u1', { category: NotificationCategory.SECURITY, email: false, sms: false, push: false });
    expect(updated.email).toBe(true);
    expect(updated.locked).toBe(true);
  });

  it('respects a disabled optional category (PRODUCT push off by default)', async () => {
    const prefs = new PreferenceService(prefRepo().repo);
    const { repo: nrepo } = notifRepo();
    const svc = new NotificationService(nrepo, allSenders, clock, prefs);
    const created = await svc.send({ userId: 'u1', category: NotificationCategory.PRODUCT, subject: 'News', body: '...' });
    expect(created.map((c) => c.channel)).toEqual([NotificationChannel.EMAIL]);
  });

  it('marks a channel FAILED when its sender returns false', async () => {
    const prefs = new PreferenceService(prefRepo().repo);
    const { repo: nrepo, store } = notifRepo();
    const failing = [sender(NotificationChannel.EMAIL, false), sender(NotificationChannel.PUSH, false)];
    const svc = new NotificationService(nrepo, failing, clock, prefs);
    await svc.send({ userId: 'u1', category: NotificationCategory.BILLING, subject: 'Invoice', body: '...' });
    expect(store.some((n) => n.status === NotificationStatus.FAILED)).toBe(true);
  });
});
