import { DocumentStatus, SignatureRequestStatus, type SignatureRequestDto } from '@dlv/shared-types';
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
import { EntitlementService } from '../../billing/application/entitlement.service';
import { DOCUMENT_REPOSITORY, type DocumentRepository } from '../../vault/application/ports';
import { resolveExpiryDays } from '../domain/seal';

import {
  SIGNATURE_REPOSITORY,
  SIGNATURE_REQUEST_REPOSITORY,
  type SignatureRepository,
  type SignatureRequestRecord,
  type SignatureRequestRepository,
} from './ports';
import { toRequestDto } from './signature.mapper';

import type { Clock } from '../../../common/time/clock';

const MS_PER_DAY = 86_400_000;

/**
 * Signature-request lifecycle (Phase 5): a document owner asks a signer to sign
 * a READY vault document. Ceremony completion + sealing lives in
 * {@link import('./signature-ceremony.service').SignatureCeremonyService}. The
 * monthly signature entitlement (Phase 6) is enforced on creation.
 */
@Injectable()
export class SignatureRequestService {
  constructor(
    @Inject(SIGNATURE_REQUEST_REPOSITORY) private readonly requests: SignatureRequestRepository,
    @Inject(SIGNATURE_REPOSITORY) private readonly signatures: SignatureRepository,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementService,
  ) {}

  async create(
    ownerId: string,
    input: {
      documentId: string;
      title: string;
      signerName: string;
      signerEmail: string;
      message?: string;
      signerUserId?: string;
      expiresInDays?: number;
    },
  ): Promise<SignatureRequestDto> {
    const document = await this.documents.findById(input.documentId);
    if (!document || document.ownerId !== ownerId) {
      throw new NotFoundException('Document not found.');
    }
    if (document.status !== DocumentStatus.READY) {
      throw new BadRequestException('Only a READY document can be sent for signature.');
    }

    // Enforce the plan's monthly signature entitlement (Phase 6, freemium).
    await this.entitlements.assertCanCreateSignature(ownerId);

    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + resolveExpiryDays(input.expiresInDays) * MS_PER_DAY);
    const rec = await this.requests.create({
      id: uuidv7(),
      documentId: input.documentId,
      ownerId,
      title: input.title,
      message: input.message ?? null,
      signerUserId: input.signerUserId ?? ownerId,
      signerName: input.signerName,
      signerEmail: input.signerEmail.toLowerCase(),
      expiresAt,
    });

    await this.audit.record({
      actorUserId: ownerId,
      eventType: 'signature_request.created',
      resource: `document:${input.documentId}`,
      payload: { requestId: rec.id, signerEmail: rec.signerEmail },
    });
    return toRequestDto(rec, null);
  }

  async list(ownerId: string): Promise<SignatureRequestDto[]> {
    const records = await this.requests.listByOwner(ownerId);
    const dtos: SignatureRequestDto[] = [];
    for (const r of records) {
      const sig = r.status === SignatureRequestStatus.COMPLETED ? await this.signatures.findByRequest(r.id) : null;
      dtos.push(toRequestDto(r, sig?.id ?? null));
    }
    return dtos;
  }

  async get(ownerId: string, id: string): Promise<SignatureRequestDto> {
    const rec = await this.loadOwned(ownerId, id);
    const sig = await this.signatures.findByRequest(id);
    return toRequestDto(rec, sig?.id ?? null);
  }

  async cancel(ownerId: string, id: string): Promise<void> {
    const rec = await this.loadOwned(ownerId, id);
    if (rec.status !== SignatureRequestStatus.PENDING) {
      throw new BadRequestException('Only a pending request can be cancelled.');
    }
    await this.requests.setStatus(id, SignatureRequestStatus.CANCELLED, null);
    await this.audit.record({
      actorUserId: ownerId,
      eventType: 'signature_request.cancelled',
      resource: `document:${rec.documentId}`,
      payload: { requestId: id },
    });
  }

  private async loadOwned(ownerId: string, id: string): Promise<SignatureRequestRecord> {
    const rec = await this.requests.findById(id);
    if (!rec) throw new NotFoundException('Signature request not found.');
    if (rec.ownerId !== ownerId) throw new ForbiddenException('Not your signature request.');
    return rec;
  }
}
