import { canonicalJson } from './canonical-json';

describe('canonicalJson', () => {
  it('orders object keys deterministically regardless of insertion order', () => {
    const a = canonicalJson({ b: 1, a: 2, c: { z: 1, y: 2 } });
    const b = canonicalJson({ c: { y: 2, z: 1 }, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":{"y":2,"z":1}}');
  });

  it('preserves array order but sorts keys within array elements', () => {
    expect(canonicalJson([{ b: 1, a: 2 }, 3])).toBe('[{"a":2,"b":1},3]');
  });

  it('omits undefined properties (so optional fields do not fork the chain)', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it('is stable for the audit-event shape', () => {
    const event = {
      prevHash: 'x',
      payload: { emailMasked: 'j***@example.com' },
      id: '1',
      eventType: 'user.registered',
      resource: 'user:1',
      occurredAt: '2026-07-06T00:00:00.000Z',
      actorUserId: '1',
      ipMasked: '102.65.x.x',
    };
    expect(canonicalJson(event)).toBe(
      '{"actorUserId":"1","eventType":"user.registered","id":"1",' +
        '"ipMasked":"102.65.x.x","occurredAt":"2026-07-06T00:00:00.000Z",' +
        '"payload":{"emailMasked":"j***@example.com"},"prevHash":"x","resource":"user:1"}',
    );
  });
});
