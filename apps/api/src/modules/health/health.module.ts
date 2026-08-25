import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

/** Liveness/readiness probes. Prisma + Redis come from their global modules. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
