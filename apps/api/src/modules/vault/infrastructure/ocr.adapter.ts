import { DetectDocumentTextCommand, TextractClient } from '@aws-sdk/client-textract';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV } from '../../../common/tokens';
import type { OcrPort } from '../application/ports';
import type { Env } from '@dlv/config';

const OCR_MIME = new Set(['image/png', 'image/jpeg', 'image/tiff', 'application/pdf']);

/**
 * OCR provider dispatch (roadmap §3: Textract with a Tesseract fallback). Selected
 * by `OCR_PROVIDER`; `none` (default in dev) skips extraction. OCR is best-effort
 * and never blocks promotion.
 */
@Injectable()
export class OcrAdapter implements OcrPort {
  private readonly logger = new Logger(OcrAdapter.name);
  private textract?: TextractClient;

  constructor(@Inject(ENV) private readonly env: Env) {}

  async extractText(bytes: Uint8Array, mimeType: string): Promise<string | null> {
    if (this.env.OCR_PROVIDER === 'none' || !OCR_MIME.has(mimeType)) return null;
    if (this.env.OCR_PROVIDER === 'textract') return this.textractOcr(bytes);
    return this.tesseractOcr(bytes);
  }

  private async textractOcr(bytes: Uint8Array): Promise<string | null> {
    this.textract ??= new TextractClient({ region: this.env.AWS_REGION });
    const res = await this.textract.send(new DetectDocumentTextCommand({ Document: { Bytes: bytes } }));
    const lines = (res.Blocks ?? [])
      .filter((b) => b.BlockType === 'LINE' && typeof b.Text === 'string')
      .map((b) => b.Text as string);
    return lines.length > 0 ? lines.join('\n') : null;
  }

  private async tesseractOcr(bytes: Uint8Array): Promise<string | null> {
    try {
      // Optional dependency loaded at runtime only when OCR_PROVIDER=tesseract.
      const mod = (await import('tesseract.js' as string)) as {
        recognize: (image: Buffer, lang: string) => Promise<{ data: { text: string } }>;
      };
      const { data } = await mod.recognize(Buffer.from(bytes), 'eng');
      const text = data.text.trim();
      return text.length > 0 ? text : null;
    } catch (err) {
      this.logger.warn(`Tesseract OCR unavailable: ${String(err)}`);
      return null;
    }
  }
}
