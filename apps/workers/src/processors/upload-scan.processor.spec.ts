import { sha256Hex } from '@dlv/crypto';
import { Job } from 'bullmq';

import { UploadScanProcessor } from './upload-scan.processor';

import type { UploadScanJob } from '../queues';

function job(data: UploadScanJob): Job<UploadScanJob> {
  return { data } as Job<UploadScanJob>;
}

describe('UploadScanProcessor', () => {
  const processor = new UploadScanProcessor();

  it('hashes, clears and promotes a valid PNG', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = await processor.process(
      job({
        documentId: 'doc-1',
        quarantineKey: 'q/doc-1',
        declaredMimeType: 'image/png',
        contentBase64: png.toString('base64'),
      }),
    );
    expect(result.sha256).toBe(sha256Hex(new Uint8Array(png)));
    expect(result.clean).toBe(true);
    expect(result.mimeValid).toBe(true);
    expect(result.promoted).toBe(true);
  });

  it('rejects a mime/magic-byte mismatch', async () => {
    const notPng = Buffer.from('plain text', 'ascii');
    const result = await processor.process(
      job({
        documentId: 'doc-2',
        quarantineKey: 'q/doc-2',
        declaredMimeType: 'image/png',
        contentBase64: notPng.toString('base64'),
      }),
    );
    expect(result.mimeValid).toBe(false);
    expect(result.promoted).toBe(false);
  });

  it('quarantines an EICAR-infected upload', async () => {
    const infected = Buffer.from('X5O!EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*', 'ascii');
    const result = await processor.process(
      job({
        documentId: 'doc-3',
        quarantineKey: 'q/doc-3',
        declaredMimeType: 'text/plain',
        contentBase64: infected.toString('base64'),
      }),
    );
    expect(result.clean).toBe(false);
    expect(result.promoted).toBe(false);
  });
});
