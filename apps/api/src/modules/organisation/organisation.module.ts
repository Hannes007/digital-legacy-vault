import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { ConsentModule } from '../consent/consent.module';
import { CLIENT_RELATIONSHIP_READER } from '../estate/application/ports';
import { IdentityModule } from '../identity/identity.module';

import { ClientRelationshipService } from './application/client-relationship.service';
import { OrgAdminService } from './application/org-admin.service';
import {
  CLIENT_RELATIONSHIP_REPOSITORY,
  ORG_DIRECTORY_PORT,
  ORG_USAGE_PORT,
} from './application/ports';
import {
  PrismaClientRelationshipRepository,
  PrismaOrgDirectoryAdapter,
  PrismaOrgUsageAdapter,
} from './infrastructure/prisma-organisation.adapters';
import { OrganisationWorkspaceController } from './presentation/organisation.controller';

/**
 * Organisation workspace bounded context (Phase 8): consent-gated professional
 * client-vault relationships (LAWYER/DOCTOR/FINANCIAL_ADVISER), per-org usage
 * metering for org billing, and data-residency controls. Exports the
 * CLIENT_RELATIONSHIP_READER the estate vault-relationship ABAC consumes.
 */
@Module({
  imports: [AuditModule, IdentityModule, ConsentModule],
  controllers: [OrganisationWorkspaceController],
  providers: [
    ClientRelationshipService,
    OrgAdminService,
    PrismaClientRelationshipRepository,
    { provide: CLIENT_RELATIONSHIP_REPOSITORY, useExisting: PrismaClientRelationshipRepository },
    { provide: CLIENT_RELATIONSHIP_READER, useExisting: PrismaClientRelationshipRepository },
    { provide: ORG_DIRECTORY_PORT, useClass: PrismaOrgDirectoryAdapter },
    { provide: ORG_USAGE_PORT, useClass: PrismaOrgUsageAdapter },
  ],
  exports: [CLIENT_RELATIONSHIP_READER],
})
export class OrganisationModule {}
