import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';

import type { SsoStateStore } from '../application/sso-ports';

const PREFIX = 'sso:state:';

/** Single-use, TTL-bound CSRF state for the SSO authorization-code flow. */
@Injectable()
export class RedisSsoStateStore implements SsoStateStore {
  constructor(private readonly redis: RedisService) {}

  async put(state: string, organisationId: string, ttlSeconds: number): Promise<void> {
    await this.redis.setWithTtl(`${PREFIX}${state}`, organisationId, ttlSeconds);
  }

  async take(state: string): Promise<string | null> {
    return this.redis.take(`${PREFIX}${state}`);
  }
}
