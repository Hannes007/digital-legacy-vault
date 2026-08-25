import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';

import type { WebauthnChallengeStore } from '../application/mfa-ports';

const REG_PREFIX = 'identity:wa:reg:';
const AUTH_PREFIX = 'identity:wa:auth:';

/**
 * Redis-backed {@link WebauthnChallengeStore}. Registration challenges are
 * keyed by user id; authentication challenges are keyed by the challenge value
 * itself so both email-scoped and discoverable (usernameless) flows resolve.
 */
@Injectable()
export class RedisWebauthnChallengeStore implements WebauthnChallengeStore {
  constructor(private readonly redis: RedisService) {}

  async putRegistration(userId: string, challenge: string, ttlSeconds: number): Promise<void> {
    await this.redis.setWithTtl(`${REG_PREFIX}${userId}`, challenge, ttlSeconds);
  }

  async takeRegistration(userId: string): Promise<string | null> {
    return this.redis.take(`${REG_PREFIX}${userId}`);
  }

  async putAuthentication(challenge: string, ttlSeconds: number): Promise<void> {
    await this.redis.setWithTtl(`${AUTH_PREFIX}${challenge}`, '1', ttlSeconds);
  }

  async takeAuthentication(challenge: string): Promise<boolean> {
    return (await this.redis.take(`${AUTH_PREFIX}${challenge}`)) !== null;
  }
}
