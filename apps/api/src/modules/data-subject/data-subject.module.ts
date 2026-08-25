import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { LegalHoldModule } from '../legal-hold/legal-hold.module';

import { DataSubjectService } from './application/data-subject.service';
import { DATA_SUBJECT_REPOSITORY, DATA_SUBJECT_REQUEST_REPOSITORY } from './application/ports';
import { PrismaDataSubjectRequestRepository } from './infrastructure/prisma-data-subject-request.repository';
import { PrismaDataSubjectRepository } from './infrastructure/prisma-data-subject.repository';
import { DataSubjectController } from './presentation/data-subject.controller';

/**
 * Data-subject (POPIA/GDPR) bounded context (Phase 5). Access/portability export
 * and right-to-erasure, enforcing legal holds (via {@link LegalHoldModule}) and
 * coexisting with S3 Object Lock through crypto-erasure.
 */
@Module({
  imports: [AuditModule, IdentityModule, LegalHoldModule],
  controllers: [DataSubjectController],
  providers: [
    DataSubjectService,
    { provide: DATA_SUBJECT_REPOSITORY, useClass: PrismaDataSubjectRepository },
    { provide: DATA_SUBJECT_REQUEST_REPOSITORY, useClass: PrismaDataSubjectRequestRepository },
  ],
})
export class DataSubjectModule {}
