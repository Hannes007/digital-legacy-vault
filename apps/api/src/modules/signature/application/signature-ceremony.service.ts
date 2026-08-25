import { sha256Hex } from '@dlv/crypto';
import { ConsentPurpose, DocumentStatus, SignatureRequestStatus, type CompleteSignatureRequest, type SignatureDto } from '@dlv/shared-types';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';


import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import { CONSENT_RECORDER, type ConsentRecorder } from '../../consent/application/ports';
import { DocumentRetentionService } from '../../vault/application/document-retention.service';
import {
  DOCUMENT_REPOSITORY,
  DOCUMENT_VERSION_REPOSITORY,
  type DocumentRepository,
  type DocumentVersionRepository,
} from '../../vault/application/ports';
import { buildSealEvidence, computeSealDigest } from '../domain/seal';

import {
  SIGNATURE_REPOSITORY,
  SIGNATURE_REQUEST_REPOSITORY,
  TIMESTAMP_AUTHORITY,
  type SignatureRepository,
  type SignatureRequestRepository,
  type TimestampAuthority,
} from './ports';
import { toSignatureDto } from './signature.mapper';

import type { Clock } from '../../../common/time/clock';

/** Coarse request metadata woven into the seal evidence. */
export interface CeremonyContext {
  ipMasked: string | null;
  userAgent: string | null;
}

/**
 * Runs the signing ceremony and produces a cryptographically sealed signature
 * (PROJECT_MEMORY §2.9): SHA-256 evidence digest + RFC 3161 trusted timestamp +
 * signer-identity/device evidence bundle. Idempotent guard: a request can only
 * be sealed once. On success it also records a first-class Consent (Phase 5) and
 * applies WORM Object Lock retention to the signed document.
 */
@Injectable()
export class SignatureCeremonyService {
  constructor(
    @Inject(SIGNATURE_REQUEST_REPOSITORY) private readonly requests: SignatureRequestRepository,
    @Inject(SIGNATURE_REPOSITORY) private readonly signatures: SignatureRepository,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(DOCUMENT_VERSION_REPOSITORY) private readonly versions: DocumentVersionRepository,
    @Inject(TIMESTAMP_AUTHORITY) private readonly tsa: TimestampAuthority,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
    @Inject(CONSENT_RECORDER) private readonly consent: ConsentRecorder,
    private readonly retention: DocumentRetentionService,
  ) {}

  async complete(
    signerUserId: string,
    requestId: string,
    input: CompleteSignatureRequest,
    ctx: CeremonyContext,
  ): Promise<SignatureDto> {
    const request = await this.requests.findById(requestId);
    if (!request) throw new NotFoundException('Signature request not found.');

    // Only the assigned signer may sign (self-sign defaults signer to owner).
    if (request.signerUserId !== null && request.signerUserId !== signerUserId) {
      throw new ForbiddenException('You are not the assigned signer for this request.');
    }

    const now = this.clock.now();
    if (request.status !== SignatureRequestStatus.PENDING) {
      throw new BadRequestException('This request is not awaiting a signature.');
    }
    if (request.expiresAt.getTime() <= now.getTime()) {
      await this.requests.setStatus(requestId, SignatureRequestStatus.EXPIRED, null);
      throw new BadRequestException('This signature request has expired.');
    }
    if (input.consentText.trim().length === 0) {
      throw new BadRequestException('Consent is required to sign.');
    }

    const document = await this.documents.findById(request.documentId);
    if (!document || document.status !== DocumentStatus.READY) {
      throw new BadRequestException('The document is no longer available to sign.');
    }
    const documentVersionSha256 = await this.currentVersionHash(document.id, document.currentVersion);

    const signatureImageSha256 = sha256Hex(input.signatureImage);
    const evidence = buildSealEvidence({
      requestId,
      documentId: document.id,
      documentVersionSha256,
      signerUserId,
      signerName: request.signerName,
      signerEmail: request.signerEmail,
      method: input.method,
      signatureImageSha256,
      consentText: input.consentText,
      consentAcceptedAt: now,
      ipMasked: ctx.ipMasked,
      userAgent: ctx.userAgent,
      capturedAt: now,
    });
    const sealDigest = computeSealDigest(evidence);
    const stamp = await this.tsa.stamp(sealDigest);

    const signature = await this.signatures.create({
      id: uuidv7(),
      requestId,
      signerUserId,
      method: input.method,
      signatureImageSha256,
      consentText: input.consentText,
      consentAcceptedAt: now,
      documentVersionSha256,
      sealDigest,
      sealAlgorithm: 'SHA-256',
      tsaAuthority: stamp.authority,
      tsaToken: stamp.token,
      tsaGenTime: stamp.genTime,
      tsaImprintAlg: stamp.imprintAlgorithm,
      evidence,
    });

    await this.requests.setStatus(requestId, SignatureRequestStatus.COMPLETED, now);
    await this.audit.record({
      actorUserId: signerUserId,
      eventType: 'signature.sealed',
      resource: `document:${document.id}`,
      ipMasked: ctx.ipMasked,
      payload: {
        requestId,
        signatureId: signature.id,
        sealDigest,
        tsaAuthority: stamp.authority,
        method: input.method,
      },
    });

    // Record consent as a first-class, queryable record bound to this signature
    // (Phase 5 — consent context), then apply WORM retention to the signed doc.
    await this.consent.record({
      userId: signerUserId,
      purpose: ConsentPurpose.ELECTRONIC_SIGNATURE,
      statementText: input.consentText,
      sourceContext: `signature:${signature.id}`,
      ipMasked: ctx.ipMasked,
      userAgent: ctx.userAgent,
      grantedAt: now,
    });
    await this.retention.applySignedRetention(document.id);

    return toSignatureDto(signature);
  }

  private async currentVersionHash(documentId: string, currentVersion: number): Promise<string> {
    const versions = await this.versions.listByDocument(documentId);
    const current = versions.find((v) => v.version === currentVersion) ?? versions[0];
    if (!current) throw new BadRequestException('The document has no stored version to sign.');
    return current.sha256;
  }
}
