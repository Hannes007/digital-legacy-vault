import { WebhookDeliveryStatus, WebhookStatus } from '@dlv/shared-types';

import { verifyWebhookSignature } from '../domain/webhook-signature';

import { WebhookDispatchService } from './webhook-dispatch.service';

import type {
  WebhookDeliveryRecord,
  WebhookDeliveryRepository,
  WebhookRecord,
  WebhookRepository,
  WebhookTransport,
} from './ports';
import type { Clock } from '../../../common/time/clock';
import type { Env } from '@dlv/config';
import type { FieldCipher } from '@dlv/crypto';

const NOW = new Date('2026-07-19T12:00:00Z');
const clock: Clock = { now: () => NOW };
const env = { WEBHOOK_MAX_ATTEMPTS: 3, WEBHOOK_TIMEOUT_MS: 5000 } as Env;
const cipher: FieldCipher = { encrypt: (v: string) => `enc:${v}`, decrypt: (v: string) => v.replace(/^enc:/, '') };

function hook(overrides: Partial<WebhookRecord> = {}): WebhookRecord {
  return {
    id: 'w1', ownerUserId: 'u1', organisationId: null, url: 'https://example.com/hook',
    secretEnc: 'enc:whsec_abc', events: ['document.ready'], status: WebhookStatus.ACTIVE,
    createdAt: NOW, ...overrides,
  };
}
function delivery(overrides: Partial<WebhookDeliveryRecord> = {}): WebhookDeliveryRecord {
  return {
    id: 'del1', webhookId: 'w1', eventType: 'document.ready', payloadJson: '{"x":1}',
    status: WebhookDeliveryStatus.PENDING, attempts: 0, nextAttemptAt: NOW,
    responseStatus: null, lastError: null, deliveredAt: null, createdAt: NOW, ...overrides,
  };
}

interface Harness {
  svc: WebhookDispatchService;
  created: Array<{ webhookId: string; eventType: string; payloadJson: string }>;
  delivered: string[];
  failed: Array<{ id: string; attempts: number; dead: boolean }>;
  posts: Array<{ url: string; body: string; headers: Record<string, string> }>;
}

function harness(opts: {
  hooks?: WebhookRecord[];
  hookById?: WebhookRecord | null;
  due?: WebhookDeliveryRecord[];
  transportOk?: boolean;
}): Harness {
  const created: Harness['created'] = [];
  const delivered: string[] = [];
  const failed: Harness['failed'] = [];
  const posts: Harness['posts'] = [];

  const webhooks: WebhookRepository = {
    create: async () => hook(),
    findById: async () => (opts.hookById === undefined ? hook() : opts.hookById),
    listByOwner: async () => opts.hooks ?? [],
    listActiveForEvent: async () => opts.hooks ?? [],
    disable: async () => undefined,
  };
  const deliveries: WebhookDeliveryRepository = {
    create: async (input) => {
      created.push(input);
      return delivery({ id: input.id });
    },
    due: async () => opts.due ?? [],
    markDelivered: async (id) => { delivered.push(id); },
    markFailed: async (id, attempts, _next, dead) => { failed.push({ id, attempts, dead }); },
    listByWebhook: async () => [],
  };
  const transport: WebhookTransport = {
    post: async (url, body, headers) => {
      posts.push({ url, body, headers });
      return opts.transportOk === false ? { ok: false, status: 500, error: 'boom' } : { ok: true, status: 200 };
    },
  };
  const svc = new WebhookDispatchService(webhooks, deliveries, transport, cipher, env, clock);
  return { svc, created, delivered, failed, posts };
}

describe('WebhookDispatchService (Phase 8)', () => {
  it('fans an event out to each subscribed endpoint', async () => {
    const h = harness({ hooks: [hook({ id: 'w1' }), hook({ id: 'w2' })] });
    const count = await h.svc.dispatch('u1', 'document.ready', { documentId: 'd1' });
    expect(count).toBe(2);
    expect(h.created.map((c) => c.webhookId).sort()).toStrictEqual(['w1', 'w2']);
    const body = JSON.parse(h.created[0]?.payloadJson ?? '{}') as { type: string; data: { documentId: string } };
    expect(body.type).toBe('document.ready');
    expect(body.data.documentId).toBe('d1');
  });

  it('signs deliveries so the receiver can verify them', async () => {
    const h = harness({ due: [delivery()], transportOk: true });
    await h.svc.processDue();
    const post = h.posts[0];
    expect(post).toBeDefined();
    const sig = post?.headers['x-dlv-signature'] ?? '';
    expect(verifyWebhookSignature('whsec_abc', sig, post?.body ?? '', Math.floor(NOW.getTime() / 1000))).toBe(true);
    expect(h.delivered).toStrictEqual(['del1']);
  });

  it('retries failures with backoff and goes DEAD at the attempt cap', async () => {
    const first = harness({ due: [delivery({ attempts: 0 })], transportOk: false });
    await first.svc.processDue();
    expect(first.failed).toStrictEqual([{ id: 'del1', attempts: 1, dead: false }]);

    const last = harness({ due: [delivery({ attempts: 2 })], transportOk: false });
    await last.svc.processDue();
    expect(last.failed).toStrictEqual([{ id: 'del1', attempts: 3, dead: true }]);
  });

  it('dead-letters deliveries whose webhook was disabled', async () => {
    const h = harness({ due: [delivery()], hookById: hook({ status: WebhookStatus.DISABLED }) });
    await h.svc.processDue();
    expect(h.failed[0]?.dead).toBe(true);
    expect(h.posts).toHaveLength(0);
  });
});
