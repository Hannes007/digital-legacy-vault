import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';

import { ConsentService } from './application/consent.service';
import { CONSENT_RECORDER, CONSENT_REPOSITORY } from './application/ports';
import { PrismaConsentRepository } from './infrastructure/prisma-consent.repository';
import { ConsentsController } from './presentation/consents.controller';

/**
 * Consent bounded context (Phase 5). First-class, audited consent records and
 * the {@link import('./application/ports').ConsentRecorder} port other contexts
 * use to emit consents (e.g. the signing ceremony's ELECTRONIC_SIGNATURE grant).
 */
@Module({
  imports: [AuditModule, IdentityModule],
  controllers: [ConsentsController],
  providers: [
    ConsentService,
    { provide: CONSENT_REPOSITORY, useClass: PrismaConsentRepository },
    { provide: CONSENT_RECORDER, useExisting: ConsentService },
  ],
  exports: [ConsentService, CONSENT_RECORDER],
})
export class ConsentModule {}
