import { DocumentType } from '@dlv/shared-types';

import { UploadService } from './upload.service';
import type {
  DocumentRepository,
  PartUrl,
  StoragePort,
  UploadMetadataStore,
  VaultRepository,
} from './ports';
import type { PromotionService } from './promotion.service';

import type { Clock } from '../../../common/time/clock';
import type { Env } from '@dlv/config';

function makeService(captured: { key?: string }) {
  const storage: StoragePort = {
    initQuarantineUpload: async (key: string, _ct, partCount): Promise<{ uploadId: string; parts: PartUrl[] }> => {
      captured.key = key;
      return { uploadId: 'u1', parts: Array.from({ length: partCount }, (_v, i) => ({ partNumber: i + 1, url: `https://s/${String(i)}` })) };
    },
    completeQuarantineUpload: async () => undefined,
    readQuarantine: async () => new Uint8Array(),
    deleteQuarantine: async () => undefined,
    putDocument: async () => undefined,
    applyRetention: async () => undefined,
    presignDocumentDownload: async () => 'https://signed',
  };
  const documents = { create: async () => ({}) } as unknown as DocumentRepository;
  const vaults: VaultRepository = {
    ensureDefault: async (ownerId) => ({ id: 'vault-1', ownerId, kind: 'STANDARD', name: 'My Vault' }),
    findById: async () => null,
  };
  const pending: UploadMetadataStore = { put: async () => undefined, take: async () => null };
  const env = { MAX_UPLOAD_BYTES: 500, UPLOAD_URL_TTL_SECONDS: 900 } as Env;
  const clock: Clock = { now: () => new Date('2026-07-07T00:00:00Z') };
  const promotion = {} as PromotionService;
  const entitlements = { assertCanAddDocument: async () => undefined } as unknown as import('../../billing/application/entitlement.service').EntitlementService;
  return new UploadService(storage, documents, vaults, pending, env, clock, promotion, entitlements);
}

describe('UploadService (abuse cases)', () => {
  it('neutralises path-traversal filenames in the storage key', async () => {
    const captured: { key?: string } = {};
    const service = makeService(captured);
    await service.initUpload('owner-1', {
      fileName: '../../etc/passwd',
      mimeType: 'text/plain',
      sizeBytes: 10,
      partCount: 1,
      type: DocumentType.OTHER,
    });
    expect(captured.key).toBeDefined();
    expect(captured.key).not.toContain('..');
    expect(captured.key!.startsWith('quarantine/owner-1/')).toBe(true);
    expect(captured.key!.endsWith('/passwd')).toBe(true); // path stripped to basename
  });

  it('rejects an oversize upload before creating anything', async () => {
    const service = makeService({});
    await expect(
      service.initUpload('owner-1', { fileName: 'big.bin', mimeType: 'application/octet-stream', sizeBytes: 10_000, partCount: 1 }),
    ).rejects.toThrow();
  });
});
