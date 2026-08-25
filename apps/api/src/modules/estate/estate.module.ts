import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { OrganisationModule } from '../organisation/organisation.module';
import { VaultModule } from '../vault/vault.module';

import { BeneficiaryService } from './application/beneficiary.service';
import { DeathVerificationService } from './application/death-verification.service';
import { EmergencyAccessService } from './application/emergency-access.service';
import { ExecutorService } from './application/executor.service';
import {
  BENEFICIARY_REPOSITORY,
  DEATH_VERIFICATION_REPOSITORY,
  EMERGENCY_REPOSITORY,
  EXECUTOR_REPOSITORY,
  NOTIFICATION_PORT,
} from './application/ports';
import { RelationshipAccessService } from './application/relationship-access.service';
import { LoggingNotificationAdapter } from './infrastructure/logging-notification.adapter';
import { PrismaBeneficiaryRepository } from './infrastructure/prisma-beneficiary.repository';
import { PrismaDeathVerificationRepository } from './infrastructure/prisma-death-verification.repository';
import { PrismaEmergencyRepository } from './infrastructure/prisma-emergency.repository';
import { PrismaExecutorRepository } from './infrastructure/prisma-executor.repository';
import { BeneficiariesController } from './presentation/beneficiaries.controller';
import { DeathVerificationsController } from './presentation/death-verifications.controller';
import { EmergencyAccessController } from './presentation/emergency-access.controller';
import { ExecutorsController } from './presentation/executors.controller';

/**
 * Estate bounded context (Phase 4): beneficiaries, executors, emergency access
 * (quorum + delay + owner notification, §7.6), death-verification workflow, and
 * the vault-relationship ABAC resolver.
 */
@Module({
  imports: [AuditModule, IdentityModule, VaultModule, OrganisationModule],
  controllers: [BeneficiariesController, ExecutorsController, EmergencyAccessController, DeathVerificationsController],
  providers: [
    BeneficiaryService,
    ExecutorService,
    EmergencyAccessService,
    DeathVerificationService,
    RelationshipAccessService,
    { provide: BENEFICIARY_REPOSITORY, useClass: PrismaBeneficiaryRepository },
    { provide: EXECUTOR_REPOSITORY, useClass: PrismaExecutorRepository },
    { provide: EMERGENCY_REPOSITORY, useClass: PrismaEmergencyRepository },
    { provide: DEATH_VERIFICATION_REPOSITORY, useClass: PrismaDeathVerificationRepository },
    { provide: NOTIFICATION_PORT, useClass: LoggingNotificationAdapter },
  ],
  exports: [RelationshipAccessService],
})
export class EstateModule {}
