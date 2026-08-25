import { DocumentStatus, SignatureMethod, SignatureRequestStatus } from '@dlv/shared-types';
import { ForbiddenException } from '@nestjs/common';


import { TsaAdapter } from '../infrastructure/tsa.adapter';

import { SealVerificationService } from './seal-verification.service';
import { SignatureCeremonyService } from './signature-ceremony.service';

import type {
  SignatureRecord,
  SignatureRepository,
  SignatureRequestRecord,
  SignatureRequestRepository,
} from './ports';
import type { Clock } from '../../../common/time/clock';
import type { AuditService } from '../../audit/audit.service';
import type {
  DocumentRecord,
  DocumentRepository,
  DocumentVersionRecord,
  DocumentVersionRepository,
} from '../../vault/application/ports';
import type { Env } from '@dlv/config';

const DEV_KEY_B64 = Buffer.alloc(32, 7).toString('base64');
const DOC_SHA = 'd'.repeat(64);

function fakeRequestRepo(seed: SignatureRequestRecord) {
  const state = { req: seed };
  const repo: SignatureRequestRepository = {
    create: async (input) => ({ ...input, status: SignatureRequestStatus.PENDING, createdAt: new Date(), completedAt: null }),
    findById: async (id) => (id === state.req.id ? state.req : null),
    listByOwner: async () => [state.req],
    setStatus: async (_id, status, completedAt) => {
      state.req = { ...state.req, status, completedAt };
    },
  };
  return { repo, state };
}

function fakeSignatureRepo() {
  const state: { sig: SignatureRecord | null } = { sig: null };
  const repo: SignatureRepository = {
    create: async (input) => {
      state.sig = { ...input, createdAt: new Date() };
      return state.sig;
    },
    findByRequest: async (requestId) => (state.sig?.requestId === requestId ? state.sig : null),
    findById: async (id) => (state.sig?.id === id ? state.sig : null),
  };
  return { repo, state };
}

function fakeDocRepos(sha: { value: string }, status = DocumentStatus.READY) {
  const doc: DocumentRecord = {
    id: 'doc-1',
    vaultId: 'vault-1',
    ownerId: 'owner-1',
    title: 'Power of Attorney',
    type: 'POWER_OF_ATTORNEY',
    status,
    categoryId: null,
    currentVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const documents = {
    findById: async () => doc,
    create: async () => doc,
    listByOwner: async () => [doc],
    updateStatus: async () => undefined,
    promote: async () => undefined,
    setCategory: async () => undefined,
  } as unknown as DocumentRepository;
  const versions: DocumentVersionRepository = {
    add: async () => ({}) as DocumentVersionRecord,
    listByDocument: async () => [
      {
        id: 'ver-1',
        documentId: 'doc-1',
        version: 1,
        sizeBytes: 10,
        mimeType: 'application/pdf',
        sha256: sha.value,
        scanVerdict: 'CLEAN',
        storageKey: 'k',
        createdAt: new Date(),
      } as unknown as DocumentVersionRecord,
    ],
  };
  return { documents, versions, doc };
}

const audit = { record: async () => undefined } as unknown as AuditService;
const env = { SIGNATURE_TSA_URL: '', FIELD_ENCRYPTION_KEY_B64: DEV_KEY_B64 } as unknown as Env;

// Phase 5: the ceremony also records a first-class consent and applies WORM
// retention to the signed document. Both are stubbed here (unit isolation).
const consentRecorder = {
  record: async () => ({}) as unknown,
} as unknown as import('../../consent/application/ports').ConsentRecorder;
const retention = {
  applySignedRetention: async () => undefined,
} as unknown as import('../../vault/application/document-retention.service').DocumentRetentionService;

function pendingRequest(overrides: Partial<SignatureRequestRecord> = {}): SignatureRequestRecord {
  return {
    id: 'req-1',
    documentId: 'doc-1',
    ownerId: 'owner-1',
    title: 'Sign the PoA',
    message: null,
    status: SignatureRequestStatus.PENDING,
    signerUserId: 'owner-1',
    signerName: 'Ada Lovelace',
    signerEmail: 'ada@example.com',
    expiresAt: new Date('2026-08-01T00:00:00Z'),
    createdAt: new Date('2026-07-13T00:00:00Z'),
    completedAt: null,
    ...overrides,
  };
}

describe('SignatureCeremonyService + SealVerificationService', () => {
  const clock: Clock = { now: () => new Date('2026-07-13T10:00:00Z') };
  const tsa = new TsaAdapter(env);

  it('seals a signature and verifies it end-to-end', async () => {
    const sha = { value: DOC_SHA };
    const { repo: reqRepo } = fakeRequestRepo(pendingRequest());
    const { repo: sigRepo } = fakeSignatureRepo();
    const { documents, versions } = fakeDocRepos(sha);

    const ceremony = new SignatureCeremonyService(reqRepo, sigRepo, documents, versions, tsa, clock, audit, consentRecorder, retention);
    const dto = await ceremony.complete(
      'owner-1',
      'req-1',
      { method: SignatureMethod.DRAW, signatureImage: 'base64-image-bytes', consentText: 'I agree to sign.' },
      { ipMasked: '102.65.x.x', userAgent: 'Chrome on macOS' },
    );

    expect(dto.tsaAuthority).toBe('dev-local');
    expect(dto.sealDigest).toHaveLength(64);
    expect(dto.documentVersionSha256).toBe(DOC_SHA);

    const verifier = new SealVerificationService(sigRepo, reqRepo, documents, versions, tsa, clock);
    const result = await verifier.verify('owner-1', [], dto.id);
    expect(result.sealDigestMatches).toBe(true);
    expect(result.timestampValid).toBe(true);
    expect(result.documentIntegrityIntact).toBe(true);
    expect(result.valid).toBe(true);
  });

  it('detects document tampering after sealing', async () => {
    const sha = { value: DOC_SHA };
    const { repo: reqRepo } = fakeRequestRepo(pendingRequest());
    const { repo: sigRepo } = fakeSignatureRepo();
    const { documents, versions } = fakeDocRepos(sha);

    const ceremony = new SignatureCeremonyService(reqRepo, sigRepo, documents, versions, tsa, clock, audit, consentRecorder, retention);
    const dto = await ceremony.complete(
      'owner-1',
      'req-1',
      { method: SignatureMethod.TYPE, signatureImage: 'Ada Lovelace', consentText: 'I agree.' },
      { ipMasked: null, userAgent: null },
    );

    sha.value = 'e'.repeat(64); // document re-versioned / altered after sealing
    const verifier = new SealVerificationService(sigRepo, reqRepo, documents, versions, tsa, clock);
    const result = await verifier.verify('owner-1', [], dto.id);
    expect(result.documentIntegrityIntact).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('rejects a signer who is not the assigned signer', async () => {
    const sha = { value: DOC_SHA };
    const { repo: reqRepo } = fakeRequestRepo(pendingRequest({ signerUserId: 'someone-else' }));
    const { repo: sigRepo } = fakeSignatureRepo();
    const { documents, versions } = fakeDocRepos(sha);
    const ceremony = new SignatureCeremonyService(reqRepo, sigRepo, documents, versions, tsa, clock, audit, consentRecorder, retention);

    await expect(
      ceremony.complete(
        'owner-1',
        'req-1',
        { method: SignatureMethod.DRAW, signatureImage: 'x', consentText: 'I agree.' },
        { ipMasked: null, userAgent: null },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses to seal an expired request', async () => {
    const sha = { value: DOC_SHA };
    const { repo: reqRepo } = fakeRequestRepo(pendingRequest({ expiresAt: new Date('2026-07-01T00:00:00Z') }));
    const { repo: sigRepo } = fakeSignatureRepo();
    const { documents, versions } = fakeDocRepos(sha);
    const ceremony = new SignatureCeremonyService(reqRepo, sigRepo, documents, versions, tsa, clock, audit, consentRecorder, retention);

    await expect(
      ceremony.complete(
        'owner-1',
        'req-1',
        { method: SignatureMethod.DRAW, signatureImage: 'x', consentText: 'I agree.' },
        { ipMasked: null, userAgent: null },
      ),
    ).rejects.toThrow(/expired/i);
  });
});
