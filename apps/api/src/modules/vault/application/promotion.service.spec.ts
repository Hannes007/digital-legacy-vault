import { decryptContent, generateDek, sha256Hex, unwrapDekWithKek, wrapDekWithKek } from '@dlv/crypto';
import { DocumentStatus, ScanVerdict } from '@dlv/shared-types';

import { PromotionService } from './promotion.service';
import type {
  CreateVersionInput,
  DocumentRecord,
  DocumentRepository,
  DocumentVersionRepository,
  KmsPort,
  OcrPort,
  ScannerPort,
  StoragePort,
} from './ports';

import type { AuditService } from '../../audit/audit.service';
import type { Env } from '@dlv/config';

const KEK = new Uint8Array(32).fill(7);
const fromB64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64'));

function makeDeps(bytes: Uint8Array, verdict = ScanVerdict.CLEAN) {
  const quarantine = new Map<string, Uint8Array>([['q/doc-1', bytes]]);
  const documentsBucket = new Map<string, Uint8Array>();
  const deleted: string[] = [];
  const storage: StoragePort = {
    initQuarantineUpload: async () => ({ uploadId: 'u', parts: [] }),
    completeQuarantineUpload: async () => undefined,
    readQuarantine: async (k) => quarantine.get(k)!,
    deleteQuarantine: async (k) => void deleted.push(k),
    putDocument: async (k, b) => void documentsBucket.set(k, b),
    applyRetention: async () => undefined,
    presignDocumentDownload: async () => 'https://signed',
  };
  const scanner: ScannerPort = { scan: async () => verdict };
  const ocr: OcrPort = { extractText: async () => null };
  const kms: KmsPort = {
    wrapDek: async (dek) => wrapDekWithKek(KEK, dek),
    unwrapDek: async (w) => unwrapDekWithKek(KEK, w),
  };
  const doc: DocumentRecord = {
    id: 'doc-1', vaultId: 'v', ownerId: 'owner-1', title: 't', type: 'OTHER',
    status: DocumentStatus.PENDING_UPLOAD, categoryId: null, currentVersion: 0,
    createdAt: new Date(), updatedAt: new Date(),
  };
  const documents: DocumentRepository = {
    create: async () => doc,
    findById: async () => doc,
    listByOwner: async () => [doc],
    updateStatus: async (_id, s) => void (doc.status = s),
    promote: async (_id, v) => { doc.currentVersion = v; doc.status = DocumentStatus.READY; },
    setCategory: async () => undefined,
  };
  const versionsStore: CreateVersionInput[] = [];
  const versions: DocumentVersionRepository = {
    add: async (input) => {
      versionsStore.push(input);
      return { id: input.id, documentId: input.documentId, version: input.version, sizeBytes: input.sizeBytes, mimeType: input.mimeType, sha256: input.sha256, scanVerdict: input.scanVerdict, storageKey: input.storageKey, createdAt: new Date() };
    },
    listByDocument: async () => [],
  };
  const audit = { record: jest.fn(async () => undefined) } as unknown as AuditService;
  const env = { MAX_UPLOAD_BYTES: 500 } as Env;
  const service = new PromotionService(storage, scanner, ocr, kms, documents, versions, env, audit);
  return { service, doc, versionsStore, documentsBucket, deleted, audit };
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const input = { documentId: 'doc-1', ownerId: 'owner-1', quarantineKey: 'q/doc-1', mimeType: 'image/png' };

describe('PromotionService (upload pipeline §7.5)', () => {
  it('promotes a clean file: hashes, envelope-encrypts, versions, deletes quarantine', async () => {
    const { service, versionsStore, documentsBucket, deleted, audit } = makeDeps(PNG);
    const result = await service.promote(input);

    expect(result.status).toBe(DocumentStatus.READY);
    expect(result.version).toBe(1);
    expect(result.sha256).toBe(sha256Hex(PNG));
    expect(versionsStore).toHaveLength(1);
    expect(deleted).toContain('q/doc-1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'document.promoted' }));

    // Envelope integrity: unwrap DEK, decrypt stored ciphertext, expect original.
    const v = versionsStore[0]!;
    const ciphertext = documentsBucket.get(v.storageKey)!;
    const dek = unwrapDekWithKek(KEK, v.wrappedDek);
    const plain = decryptContent(dek, { ciphertext, iv: fromB64(v.contentIv), tag: fromB64(v.contentTag) }, 'doc-1:v1');
    expect(Buffer.from(plain).equals(Buffer.from(PNG))).toBe(true);
  });

  it('quarantines an infected upload (never promotes)', async () => {
    const { service, versionsStore, deleted, doc, audit } = makeDeps(PNG, ScanVerdict.INFECTED);
    const result = await service.promote(input);
    expect(result.status).toBe(DocumentStatus.INFECTED);
    expect(versionsStore).toHaveLength(0);
    expect(deleted).toContain('q/doc-1');
    expect(doc.status).toBe(DocumentStatus.INFECTED);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'document.scan.infected' }));
  });

  it('rejects a magic-byte/mime mismatch', async () => {
    const notPng = new Uint8Array(Buffer.from('this is plain text', 'utf8'));
    const { service, versionsStore } = makeDeps(notPng);
    const result = await service.promote(input);
    expect(result.status).toBe(DocumentStatus.INVALID);
    expect(versionsStore).toHaveLength(0);
  });

  it('rejects an oversize object', async () => {
    const big = new Uint8Array(600); // > MAX_UPLOAD_BYTES (500)
    big.set(PNG);
    const { service, audit } = makeDeps(big);
    const result = await service.promote(input);
    expect(result.status).toBe(DocumentStatus.INVALID);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'document.validation.oversize' }));
  });

  it('marks FAILED on scanner error', async () => {
    const { service } = makeDeps(PNG, ScanVerdict.ERROR);
    expect((await service.promote(input)).status).toBe(DocumentStatus.FAILED);
  });

  it('refuses to promote for a non-owner', async () => {
    const { service } = makeDeps(PNG);
    expect((await service.promote({ ...input, ownerId: 'someone-else' })).status).toBe(DocumentStatus.FAILED);
  });
});
