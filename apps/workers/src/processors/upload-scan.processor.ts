import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { sha256Hex } from '@dlv/crypto';

import { QUEUE_NAMES, type UploadScanJob, type UploadScanResult } from '../queues';

// Leading magic bytes for the formats we can cheaply verify; unknown types fall
// through to deeper validation elsewhere.
const SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
};

const EICAR = Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE', 'ascii');

function validateMagicBytes(bytes: Buffer, mime: string): boolean {
  const sigs = SIGNATURES[mime];
  if (!sigs) return true;
  return sigs.some((sig) => sig.every((byte, i) => bytes[i] === byte));
}

/**
 * Quarantine → scan → validate → hash → promote (security invariant §7.5).
 * Here we simulate the ClamAV verdict (EICAR test-string detection) and do
 * magic-byte validation; the SHA-256 recorded is the integrity anchor. A real
 * deployment streams the object from the quarantine bucket by key.
 */
@Processor(QUEUE_NAMES.uploadScan)
export class UploadScanProcessor extends WorkerHost {
  private readonly logger = new Logger(UploadScanProcessor.name);

  process(job: Job<UploadScanJob>): Promise<UploadScanResult> {
    const { documentId, declaredMimeType, contentBase64 } = job.data;
    const bytes = contentBase64 ? Buffer.from(contentBase64, 'base64') : Buffer.alloc(0);

    const sha256 = sha256Hex(new Uint8Array(bytes));
    const clean = !bytes.includes(EICAR);
    const mimeValid = validateMagicBytes(bytes, declaredMimeType);
    const promoted = clean && mimeValid;

    this.logger.log(
      `document=${documentId} clean=${clean} mimeValid=${mimeValid} promoted=${promoted}`,
    );
    return Promise.resolve({ documentId, sha256, clean, mimeValid, promoted });
  }
}
