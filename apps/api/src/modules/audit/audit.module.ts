import { Module } from '@nestjs/common';

import { AuditService } from './audit.service';

/** Audit context — exports the hash-chained append service to feature modules. */
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
