import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { PendingUpload, UploadMetadataStore } from '../application/ports';

const PREFIX = 'vault:upload:';

/** Redis-backed pending-upload metadata (init → complete handoff), get-and-delete. */
@Injectable()
export class RedisUploadMetadataStore implements UploadMetadataStore {
  constructor(private readonly redis: RedisService) {}

  async put(documentId: string, meta: PendingUpload, ttlSeconds: number): Promise<void> {
    await this.redis.setWithTtl(`${PREFIX}${documentId}`, JSON.stringify(meta), ttlSeconds);
  }

  async take(documentId: string): Promise<PendingUpload | null> {
    const raw = await this.redis.take(`${PREFIX}${documentId}`);
    return raw ? (JSON.parse(raw) as PendingUpload) : null;
  }
}
