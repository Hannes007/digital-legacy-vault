import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { VaultModule } from '../vault/vault.module';

import { AccessRequestService } from './application/access-request.service';
import { ACCESS_REQUEST_REPOSITORY, SECURE_LINK_REPOSITORY, SHARE_REPOSITORY } from './application/ports';
import { SecureLinkService } from './application/secure-link.service';
import { ShareService } from './application/share.service';
import { PrismaAccessRequestRepository } from './infrastructure/prisma-access-request.repository';
import { PrismaSecureLinkRepository } from './infrastructure/prisma-secure-link.repository';
import { PrismaShareRepository } from './infrastructure/prisma-share.repository';
import { AccessRequestsController } from './presentation/access-requests.controller';
import { PublicSecureLinksController, SecureLinksController } from './presentation/secure-links.controller';
import { SharesController } from './presentation/shares.controller';

/** Sharing bounded context (Phase 4): shares, secure links (QR-friendly), access requests. */
@Module({
  imports: [AuditModule, IdentityModule, VaultModule],
  controllers: [SharesController, SecureLinksController, PublicSecureLinksController, AccessRequestsController],
  providers: [
    ShareService,
    SecureLinkService,
    AccessRequestService,
    { provide: SHARE_REPOSITORY, useClass: PrismaShareRepository },
    { provide: SECURE_LINK_REPOSITORY, useClass: PrismaSecureLinkRepository },
    { provide: ACCESS_REQUEST_REPOSITORY, useClass: PrismaAccessRequestRepository },
  ],
})
export class SharingModule {}
