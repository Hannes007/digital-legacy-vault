import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';

import { LegalHoldService } from './application/legal-hold.service';
import { LEGAL_HOLD_REPOSITORY } from './application/ports';
import { PrismaLegalHoldRepository } from './infrastructure/prisma-legal-hold.repository';
import { LegalHoldsController } from './presentation/legal-holds.controller';

/**
 * Legal-hold bounded context (Phase 5). Litigation/regulatory preservation
 * holds and their enforcement seam (`resolveActiveHolds`), consumed by the
 * data-subject erasure path. Exported so the data-subject context can enforce.
 */
@Module({
  imports: [AuditModule, IdentityModule],
  controllers: [LegalHoldsController],
  providers: [
    LegalHoldService,
    { provide: LEGAL_HOLD_REPOSITORY, useClass: PrismaLegalHoldRepository },
  ],
  exports: [LegalHoldService],
})
export class LegalHoldModule {}
