import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { ConsentModule } from '../consent/consent.module';
import { IdentityModule } from '../identity/identity.module';
import { VaultModule } from '../vault/vault.module';

import {
  SIGNATURE_REPOSITORY,
  SIGNATURE_REQUEST_REPOSITORY,
  TIMESTAMP_AUTHORITY,
} from './application/ports';
import { SealVerificationService } from './application/seal-verification.service';
import { SignatureCeremonyService } from './application/signature-ceremony.service';
import { SignatureRequestService } from './application/signature-request.service';
import { PrismaSignatureRequestRepository } from './infrastructure/prisma-signature-request.repository';
import { PrismaSignatureRepository } from './infrastructure/prisma-signature.repository';
import { TsaAdapter } from './infrastructure/tsa.adapter';
import { SignatureRequestsController } from './presentation/signature-requests.controller';
import { SignaturesController } from './presentation/signatures.controller';

/**
 * Signature bounded context (Phase 5): ECTA-aligned signing ceremonies + seal +
 * verification. Records a first-class consent and applies WORM retention on the
 * signed document. Imports BillingModule to enforce the monthly signature
 * entitlement (Phase 6).
 */
@Module({
  imports: [AuditModule, BillingModule, ConsentModule, IdentityModule, VaultModule],
  controllers: [SignatureRequestsController, SignaturesController],
  providers: [
    SignatureRequestService,
    SignatureCeremonyService,
    SealVerificationService,
    { provide: SIGNATURE_REQUEST_REPOSITORY, useClass: PrismaSignatureRequestRepository },
    { provide: SIGNATURE_REPOSITORY, useClass: PrismaSignatureRepository },
    { provide: TIMESTAMP_AUTHORITY, useClass: TsaAdapter },
  ],
})
export class SignatureModule {}
