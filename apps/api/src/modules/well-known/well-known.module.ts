import { Module } from '@nestjs/common';

import { WellKnownController } from './well-known.controller';

/** RFC 9116 security.txt disclosure endpoint (Phase 9). */
@Module({
  controllers: [WellKnownController],
})
export class WellKnownModule {}
