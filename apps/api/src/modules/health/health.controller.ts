import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

/**
 * Kubernetes probes (phase-2-contracts). Mounted OUTSIDE the `/api/v1` prefix
 * so orchestrators hit stable `/health/*` paths.
 *
 * - `live`: process is up; no dependencies checked (never fails on a slow DB,
 *   which would cause needless restarts).
 * - `ready`: dependencies reachable; failing pulls the pod from the LB.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<{ status: 'ok'; checks: Record<string, 'ok'> }> {
    const [dbOk, redisOk] = await Promise.all([this.checkDb(), this.checkRedis()]);
    if (!dbOk || !redisOk) {
      throw new ServiceUnavailableException({
        code: 'NOT_READY',
        errors: {
          database: dbOk ? [] : ['unreachable'],
          redis: redisOk ? [] : ['unreachable'],
        },
      });
    }
    return { status: 'ok', checks: { database: 'ok', redis: 'ok' } };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return await this.redis.ping();
    } catch {
      return false;
    }
  }
}
