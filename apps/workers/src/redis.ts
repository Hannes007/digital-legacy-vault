import type { ConnectionOptions } from 'bullmq';

/**
 * BullMQ connection options parsed from REDIS_URL. Passing options (not a shared
 * ioredis instance) lets BullMQ manage its own connections with the required
 * `maxRetriesPerRequest: null`. TLS is enabled for the rediss:// scheme so the
 * ElastiCache in-transit encryption (invariant §7.1) is honoured.
 */
export function createRedisConnection(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  const options: Record<string, unknown> = {
    host: url.hostname,
    port: Number(url.port || 6379),
    maxRetriesPerRequest: null,
  };
  if (url.username) options.username = url.username;
  if (url.password) options.password = decodeURIComponent(url.password);
  if (url.protocol === 'rediss:') options.tls = {};
  return options as ConnectionOptions;
}
