import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';

import type { LoginAttemptGuard } from '../application/ports';

const COUNT_PREFIX = 'identity:la:count:';
const LOCK_PREFIX = 'identity:la:lock:';
/** Failure counter window: 1 hour (aligns with the 10/hr/account budget). */
const COUNT_TTL_SECONDS = 60 * 60;
/** Backoff starts after this many failures. */
const BACKOFF_THRESHOLD = 5;
/** Lock ceiling: 15 minutes (phase-2-contracts). */
const MAX_LOCK_SECONDS = 15 * 60;

/**
 * Redis-backed {@link LoginAttemptGuard} implementing exponential backoff after
 * 5 failed logins (2^n seconds, capped at 15 minutes). Keys are derived from a
 * hash of the email by the caller, so nothing here reveals account existence.
 */
@Injectable()
export class RedisLoginAttemptGuard implements LoginAttemptGuard {
  constructor(private readonly redis: RedisService) {}

  async isLocked(accountKey: string): Promise<boolean> {
    return (await this.redis.get(`${LOCK_PREFIX}${accountKey}`)) !== null;
  }

  async recordFailure(accountKey: string): Promise<void> {
    const count = await this.redis.incrementWithTtl(`${COUNT_PREFIX}${accountKey}`, COUNT_TTL_SECONDS);
    if (count >= BACKOFF_THRESHOLD) {
      const lockSeconds = Math.min(2 ** (count - BACKOFF_THRESHOLD + 1), MAX_LOCK_SECONDS);
      await this.redis.setWithTtl(`${LOCK_PREFIX}${accountKey}`, '1', lockSeconds);
    }
  }

  async reset(accountKey: string): Promise<void> {
    await Promise.all([
      this.redis.del(`${COUNT_PREFIX}${accountKey}`),
      this.redis.del(`${LOCK_PREFIX}${accountKey}`),
    ]);
  }
}
