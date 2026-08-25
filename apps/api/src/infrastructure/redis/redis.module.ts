import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';

/** Global Redis access — one client shared across every context. */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
