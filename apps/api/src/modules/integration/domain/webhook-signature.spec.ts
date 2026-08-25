import { signWebhookPayload, verifyWebhookSignature } from './webhook-signature';

describe('webhook signing (Phase 8)', () => {
  const secret = 'whsec_test_secret';
  const body = '{"type":"document.ready","data":{"id":"d1"}}';

  it('produces a signature the verifier accepts', () => {
    const header = signWebhookPayload(secret, 1_800_000_000, body);
    expect(header).toMatch(/^t=1800000000,v1=[0-9a-f]{64}$/);
    expect(verifyWebhookSignature(secret, header, body, 1_800_000_010)).toBe(true);
  });

  it('rejects a tampered body, wrong secret, and replayed timestamp', () => {
    const header = signWebhookPayload(secret, 1_800_000_000, body);
    expect(verifyWebhookSignature(secret, header, body + 'x', 1_800_000_010)).toBe(false);
    expect(verifyWebhookSignature('other', header, body, 1_800_000_010)).toBe(false);
    expect(verifyWebhookSignature(secret, header, body, 1_800_000_000 + 3600)).toBe(false);
  });

  it('rejects malformed headers', () => {
    expect(verifyWebhookSignature(secret, 'nonsense', body, 1_800_000_000)).toBe(false);
    expect(verifyWebhookSignature(secret, 't=abc,v1=', body, 1_800_000_000)).toBe(false);
  });
});
