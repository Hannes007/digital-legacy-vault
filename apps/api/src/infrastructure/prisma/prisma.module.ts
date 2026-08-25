import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/** Global Prisma access — one connection pool shared across every context. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
