import {
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  type DataSubjectExportDto,
  type DataSubjectRequestDto,
  type ErasureResultDto,
} from '@dlv/shared-types';
import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import { LegalHoldService } from '../../legal-hold/application/legal-hold.service';

import {
  DATA_SUBJECT_REPOSITORY,
  DATA_SUBJECT_REQUEST_REPOSITORY,
  type DataSubjectRepository,
  type DataSubjectRequestRecord,
  type DataSubjectRequestRepository,
} from './ports';

import type { Clock } from '../../../common/time/clock';

/**
 * POPIA/GDPR data-subject tooling v1 (Phase 5): access/portability export and
 * right-to-erasure. Erasure is **refused** while any legal hold covers the
 * subject, and uses crypto-erasure so it coexists with S3 Object Lock (we never
 * attempt to delete WORM-retained objects — we destroy their keys instead).
 */
@Injectable()
export class DataSubjectService {
  constructor(
    @Inject(DATA_SUBJECT_REPOSITORY) private readonly data: DataSubjectRepository,
    @Inject(DATA_SUBJECT_REQUEST_REPOSITORY) private readonly requests: DataSubjectRequestRepository,
    private readonly legalHolds: LegalHoldService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async exportData(userId: string): Promise<DataSubjectExportDto> {
    const now = this.clock.now();
    const req = await this.requests.create({ id: uuidv7(), userId, type: DataSubjectRequestType.EXPORT, requestedAt: now });
    const d = await this.data.exportData(userId);
    await this.requests.complete(req.id, DataSubjectRequestStatus.COMPLETED, 'Export generated.', this.clock.now());
    await this.audit.record({
      actorUserId: userId,
      eventType: 'data_subject.export',
      resource: `user:${userId}`,
      payload: { requestId: req.id, documents: d.documents.length, signatures: d.signatures.length },
    });
    return {
      generatedAt: now.toISOString(),
      profile: {
        id: d.profile.id,
        email: d.profile.email,
        firstName: d.profile.firstName,
        lastName: d.profile.lastName,
        status: d.profile.status,
        roles: d.profile.roles,
        createdAt: d.profile.createdAt.toISOString(),
      },
      documents: d.documents.map((x) => ({
        id: x.id,
        title: x.title,
        type: x.type,
        status: x.status,
        currentVersion: x.currentVersion,
        createdAt: x.createdAt.toISOString(),
      })),
      signatures: d.signatures.map((x) => ({
        id: x.id,
        requestId: x.requestId,
        method: x.method,
        sealDigest: x.sealDigest,
        createdAt: x.createdAt.toISOString(),
      })),
      consents: d.consents.map((x) => ({
        id: x.id,
        purpose: x.purpose,
        status: x.status,
        grantedAt: x.grantedAt.toISOString(),
        withdrawnAt: x.withdrawnAt ? x.withdrawnAt.toISOString() : null,
      })),
      clientVaultItems: d.clientVaultItems.map((x) => ({ id: x.id, label: x.label, createdAt: x.createdAt.toISOString() })),
      legalHolds: [],
    };
  }

  async requestErasure(userId: string): Promise<ErasureResultDto> {
    const now = this.clock.now();
    const req = await this.requests.create({ id: uuidv7(), userId, type: DataSubjectRequestType.ERASURE, requestedAt: now });

    const scope = await this.data.gatherScope(userId);
    const holds = await this.legalHolds.resolveActiveHolds({ userId, ...scope });

    if (holds.length > 0) {
      const detail = `Erasure refused: ${String(holds.length)} active legal hold(s) apply.`;
      await this.requests.complete(req.id, DataSubjectRequestStatus.REFUSED, detail, this.clock.now());
      await this.audit.record({
        actorUserId: userId,
        eventType: 'data_subject.erasure.refused',
        resource: `user:${userId}`,
        payload: { requestId: req.id, holdIds: holds.map((h) => h.id) },
      });
      return {
        requestId: req.id,
        status: DataSubjectRequestStatus.REFUSED,
        detail,
        blockingHolds: holds.map((h) => ({ id: h.id, scopeType: h.scopeType, scopeId: h.scopeId, reason: h.reason })),
      };
    }

    const counts = await this.data.eraseData(userId, this.clock.now());
    const detail =
      `Crypto-erasure complete: ${String(counts.documentVersionsShredded)} document key(s) destroyed, ` +
      `${String(counts.clientVaultItemsDeleted)} client-vault item(s) deleted, ` +
      `${String(counts.sessionsRevoked)} session(s) revoked, profile anonymised.`;
    await this.requests.complete(req.id, DataSubjectRequestStatus.COMPLETED, detail, this.clock.now());
    await this.audit.record({
      actorUserId: userId,
      eventType: 'data_subject.erasure.completed',
      resource: `user:${userId}`,
      payload: { requestId: req.id, ...counts },
    });
    return { requestId: req.id, status: DataSubjectRequestStatus.COMPLETED, detail, blockingHolds: [] };
  }

  async listRequests(userId: string): Promise<DataSubjectRequestDto[]> {
    const recs = await this.requests.listByUser(userId);
    return recs.map(toRequestDto);
  }
}

function toRequestDto(r: DataSubjectRequestRecord): DataSubjectRequestDto {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    detail: r.detail,
    requestedAt: r.requestedAt.toISOString(),
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}
