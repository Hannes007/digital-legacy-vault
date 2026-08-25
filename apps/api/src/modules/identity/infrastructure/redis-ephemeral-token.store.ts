import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';

import type { EphemeralTokenStore } from '../application/ports';

const EMAIL_VERIFICATION_PREFIX = 'identity:ev:';
const MFA_PREFIX = 'identity:mfa:';

/**
 * Redis-backed {@link EphemeralTokenStore}. Values are user ids; keys embed a
 * hash of the token (email verification) or the opaque token itself (MFA, which
 * is already high-entropy and single-use). All reads are atomic get-and-delete.
 */
@Injectable()
export class RedisEphemeralTokenStore implements EphemeralTokenStore {
  constructor(private readonly redis: RedisService) {}

  async putEmailVerification(
    tokenHash: string,
    userId: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.setWithTtl(`${EMAIL_VERIFICATION_PREFIX}${tokenHash}`, userId, ttlSeconds);
  }

  async takeEmailVerification(tokenHash: string): Promise<string | null> {
    return this.redis.take(`${EMAIL_VERIFICATION_PREFIX}${tokenHash}`);
  }

  async putMfa(token: string, userId: string, ttlSeconds: number): Promise<void> {
    await this.redis.setWithTtl(`${MFA_PREFIX}${token}`, userId, ttlSeconds);
  }

  async takeMfa(token: string): Promise<string | null> {
    return this.redis.take(`${MFA_PREFIX}${token}`);
  }
}
