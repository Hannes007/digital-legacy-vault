import { Role, type SealVerificationDto } from '@dlv/shared-types';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';


import { CLOCK } from '../../../common/tokens';
import { DOCUMENT_REPOSITORY, DOCUMENT_VERSION_REPOSITORY, type DocumentRepository, type DocumentVersionRepository } from '../../vault/application/ports';
import { computeSealDigest } from '../domain/seal';

import {
  SIGNATURE_REPOSITORY,
  SIGNATURE_REQUEST_REPOSITORY,
  TIMESTAMP_AUTHORITY,
  type SignatureRepository,
  type SignatureRequestRepository,
  type TimestampAuthority,
} from './ports';

import type { Clock } from '../../../common/time/clock';

/** Platform roles allowed to verify any signature (independent assurance). */
const AUDIT_ROLES: Role[] = [Role.AUDITOR, Role.SYSTEM_ADMIN, Role.SUPER_ADMIN];

/**
 * Independently re-verifies a signature seal (roadmap Phase 5 exit criterion —
 * "seal verification tool validates independently"):
 *
 *  1. Recompute the evidence digest and compare to the stored seal digest.
 *  2. Verify the trusted-timestamp token stamps that exact digest.
 *  3. Confirm the signed document's current content hash still matches what
 *     was sealed (tamper / re-version detection).
 */
@Injectable()
export class SealVerificationService {
  constructor(
    @Inject(SIGNATURE_REPOSITORY) private readonly signatures: SignatureRepository,
    @Inject(SIGNATURE_REQUEST_REPOSITORY) private readonly requests: SignatureRequestRepository,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(DOCUMENT_VERSION_REPOSITORY) private readonly versions: DocumentVersionRepository,
    @Inject(TIMESTAMP_AUTHORITY) private readonly tsa: TimestampAuthority,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async verify(userId: string, roles: Role[], signatureId: string): Promise<SealVerificationDto> {
    const signature = await this.signatures.findById(signatureId);
    if (!signature) throw new NotFoundException('Signature not found.');
    const request = await this.requests.findById(signature.requestId);
    if (!request) throw new NotFoundException('Signature request not found.');

    const isParty = request.ownerId === userId || signature.signerUserId === userId;
    const isAuditor = roles.some((r) => AUDIT_ROLES.includes(r));
    if (!isParty && !isAuditor) {
      throw new ForbiddenException('Not permitted to verify this signature.');
    }

    const recomputed = computeSealDigest(signature.evidence);
    const sealDigestMatches = recomputed === signature.sealDigest;

    const timestampValid = await this.tsa.verify(signature.sealDigest, {
      authority: signature.tsaAuthority,
      token: signature.tsaToken,
    });

    const document = await this.documents.findById(request.documentId);
    let documentIntegrityIntact = false;
    if (document) {
      const versions = await this.versions.listByDocument(document.id);
      const current = versions.find((v) => v.version === document.currentVersion) ?? versions[0];
      documentIntegrityIntact = current?.sha256 === signature.documentVersionSha256;
    }

    const valid = sealDigestMatches && timestampValid && documentIntegrityIntact;
    return {
      signatureId,
      sealDigestMatches,
      timestampValid,
      documentIntegrityIntact,
      valid,
      checkedAt: this.clock.now().toISOString(),
      details: valid
        ? 'Seal intact: evidence digest, trusted timestamp and document content all verified.'
        : this.describe(sealDigestMatches, timestampValid, documentIntegrityIntact),
    };
  }

  private describe(seal: boolean, ts: boolean, doc: boolean): string {
    const failures: string[] = [];
    if (!seal) failures.push('evidence digest does not match the recorded seal');
    if (!ts) failures.push('trusted timestamp failed verification');
    if (!doc) failures.push('the signed document content has changed since sealing');
    return `Seal verification failed: ${failures.join('; ')}.`;
  }
}
