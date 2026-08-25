import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import { ENV } from '../../common/tokens';

import type { Env } from '@dlv/config';


/**
 * Redis access for ephemeral security state: email-verification tokens, the
 * short-lived MFA continuation token, WebAuthn challenges and login-attempt
 * counters (phase-2-contracts cross-cutting rules). Nothing durable lives here.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  /** Underlying ioredis client (exposed for the throttler storage adapter). */
  readonly client: Redis;

  constructor(@Inject(ENV) env: Env) {
    this.client = new Redis(env.REDIS_URL, {
      // Fail fast rather than queueing commands forever when Redis is down.
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  /** Store `value` at `key` with a TTL in seconds. */
  async setWithTtl(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  /** Atomically read and delete a key (single-use token semantics). */
  async take(key: string): Promise<string | null> {
    // GETDEL is atomic on Redis >= 6.2 (redis:7 in docker-compose).
    return this.client.getdel(key);
  }

  /** Read a key without consuming it. */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** Delete a key. */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Increment a counter, (re)setting its TTL on first write, and return the new
   * value. Used for login-attempt accounting.
   */
  async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return count;
  }

  /** Liveness check used by the readiness probe. */
  async ping(): Promise<boolean> {
    const pong: string = await this.client.ping();
    return pong === 'PONG';
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
