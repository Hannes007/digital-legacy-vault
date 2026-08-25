import { SignatureMethod } from '@dlv/shared-types';

import { buildSealEvidence, computeSealDigest, resolveExpiryDays } from './seal';

const base = {
  requestId: 'req-1',
  documentId: 'doc-1',
  documentVersionSha256: 'a'.repeat(64),
  signerUserId: 'user-1',
  signerName: 'Ada Lovelace',
  signerEmail: 'ada@example.com',
  method: SignatureMethod.DRAW,
  signatureImageSha256: 'b'.repeat(64),
  consentText: 'I intend to sign this document.',
  consentAcceptedAt: new Date('2026-07-13T10:00:00.000Z'),
  ipMasked: '102.65.x.x',
  userAgent: 'Chrome on macOS',
  capturedAt: new Date('2026-07-13T10:00:00.000Z'),
};

describe('resolveExpiryDays', () => {
  it('defaults to 14 days and clamps to the 90-day maximum', () => {
    expect(resolveExpiryDays(undefined)).toBe(14);
    expect(resolveExpiryDays(0)).toBe(14);
    expect(resolveExpiryDays(30)).toBe(30);
    expect(resolveExpiryDays(1000)).toBe(90);
  });
});

describe('seal evidence + digest', () => {
  it('produces a stable digest for identical inputs', () => {
    expect(computeSealDigest(buildSealEvidence(base))).toBe(computeSealDigest(buildSealEvidence(base)));
  });

  it('changes the digest when any bound field changes', () => {
    const original = computeSealDigest(buildSealEvidence(base));
    const otherDoc = computeSealDigest(buildSealEvidence({ ...base, documentVersionSha256: 'c'.repeat(64) }));
    const otherSigner = computeSealDigest(buildSealEvidence({ ...base, signerUserId: 'user-2' }));
    expect(otherDoc).not.toBe(original);
    expect(otherSigner).not.toBe(original);
  });
});
