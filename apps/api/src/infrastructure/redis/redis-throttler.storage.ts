import { Injectable } from '@nestjs/common';

import { RedisService } from './redis.service';

import type { ThrottlerStorage } from '@nestjs/throttler';


/**
 * Atomic fixed-window increment + block. All time arguments/values are in
 * milliseconds inside Redis; the returned expiry values are converted to
 * seconds to match `@nestjs/throttler`'s `ThrottlerStorageRecord` contract.
 *
 * KEYS[1]=hits, KEYS[2]=block · ARGV = ttlMs, limit, blockDurationMs
 * returns { totalHits, msToExpire, isBlocked(0|1), msToBlockExpire }
 */
const INCREMENT_SCRIPT = `
local hitsKey = KEYS[1]
local blockKey = KEYS[2]
local ttlMs = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockMs = tonumber(ARGV[3])

local blockPttl = redis.call('PTTL', blockKey)
if blockPttl > 0 then
  local hits = tonumber(redis.call('GET', hitsKey)) or (limit + 1)
  local httl = redis.call('PTTL', hitsKey)
  if httl < 0 then httl = 0 end
  return { hits, httl, 1, blockPttl }
end

local totalHits = redis.call('INCR', hitsKey)
local timeToExpire = redis.call('PTTL', hitsKey)
if timeToExpire < 0 then
  redis.call('PEXPIRE', hitsKey, ttlMs)
  timeToExpire = ttlMs
end

local isBlocked = 0
local timeToBlockExpire = 0
if totalHits > limit then
  redis.call('SET', blockKey, '1', 'PX', blockMs)
  isBlocked = 1
  timeToBlockExpire = blockMs
end
return { totalHits, timeToExpire, isBlocked, timeToBlockExpire }
`;

/**
 * Redis-backed {@link ThrottlerStorage} so rate limits are shared across API
 * replicas (phase-2-contracts cross-cutting rules) instead of being per-pod.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{ totalHits: number; timeToExpire: number; isBlocked: boolean; timeToBlockExpire: number }> {
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle:block:${throttlerName}:${key}`;
    const raw = (await this.redis.client.eval(
      INCREMENT_SCRIPT,
      2,
      hitsKey,
      blockKey,
      String(ttl),
      String(limit),
      String(blockDuration),
    )) as [number, number, number, number];

    return {
      totalHits: raw[0],
      timeToExpire: Math.ceil(raw[1] / 1000),
      isBlocked: raw[2] === 1,
      timeToBlockExpire: Math.ceil(raw[3] / 1000),
    };
  }
}
