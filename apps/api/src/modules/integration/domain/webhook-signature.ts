import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Webhook delivery signing (Phase 8, Stripe-style scheme):
 *   X-DLV-Signature: t=<unix seconds>,v1=<hex hmac-sha256(secret, `${t}.${body}`)>
 * Binding the timestamp into the MAC lets receivers reject replays.
 */
export function signWebhookPayload(secret: string, timestampSeconds: number, body: string): string {
  const mac = createHmac('sha256', secret).update(`${String(timestampSeconds)}.${body}`).digest('hex');
  return `t=${String(timestampSeconds)},v1=${mac}`;
}

/** Receiver-side verification helper (also used by the partner docs + tests). */
export function verifyWebhookSignature(
  secret: string,
  header: string,
  body: string,
  nowSeconds: number,
  toleranceSeconds = 300,
): boolean {
  const parts = new Map(
    header.split(',').map((p) => {
      const idx = p.indexOf('=');
      return [p.slice(0, idx), p.slice(idx + 1)] as const;
    }),
  );
  const t = Number(parts.get('t'));
  const v1 = parts.get('v1');
  if (!Number.isFinite(t) || !v1) return false;
  if (Math.abs(nowSeconds - t) > toleranceSeconds) return false;
  const expected = createHmac('sha256', secret).update(`${String(t)}.${body}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
