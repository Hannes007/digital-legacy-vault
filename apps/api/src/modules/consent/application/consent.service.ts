import { ConsentStatus, type ConsentDto } from '@dlv/shared-types';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';

import { toConsentDto } from './consent.mapper';
import {
  CONSENT_REPOSITORY,
  type ConsentRecord,
  type ConsentRecorder,
  type ConsentRepository,
  type RecordConsentInput,
} from './ports';

import type { Clock } from '../../../common/time/clock';

/**
 * First-class Consent context (Phase 5). Consent used to be captured only inline
 * on each Signature; this service makes every grant/withdrawal an independent,
 * queryable, audited record (POPIA §11 / GDPR art. 7) and doubles as the
 * {@link ConsentRecorder} port other contexts (e.g. signature) depend on.
 */
@Injectable()
export class ConsentService implements ConsentRecorder {
  constructor(
    @Inject(CONSENT_REPOSITORY) private readonly consents: ConsentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  /** Records a consent grant (implements the cross-context recorder port). */
  async record(input: RecordConsentInput): Promise<ConsentRecord> {
    if (input.statementText.trim().length === 0) {
      throw new BadRequestException('A consent statement is required.');
    }
    const rec = await this.consents.create({
      id: uuidv7(),
      userId: input.userId,
      purpose: input.purpose,
      statementText: input.statementText,
      statementVersion: input.statementVersion ?? '1',
      sourceContext: input.sourceContext ?? null,
      ipMasked: input.ipMasked ?? null,
      userAgent: input.userAgent ?? null,
      grantedAt: input.grantedAt,
    });
    await this.audit.record({
      actorUserId: input.userId,
      eventType: 'consent.granted',
      resource: `consent:${rec.id}`,
      ipMasked: input.ipMasked ?? null,
      payload: { purpose: rec.purpose, sourceContext: rec.sourceContext, statementVersion: rec.statementVersion },
    });
    return rec;
  }

  /** Records a consent grant from an HTTP caller and returns its DTO. */
  async grant(
    userId: string,
    input: { purpose: RecordConsentInput['purpose']; statementText: string; statementVersion?: string; sourceContext?: string },
    ctx: { ipMasked: string | null; userAgent: string | null },
  ): Promise<ConsentDto> {
    const rec = await this.record({
      userId,
      purpose: input.purpose,
      statementText: input.statementText,
      statementVersion: input.statementVersion,
      sourceContext: input.sourceContext ?? null,
      ipMasked: ctx.ipMasked,
      userAgent: ctx.userAgent,
      grantedAt: this.clock.now(),
    });
    return toConsentDto(rec);
  }

  async list(userId: string): Promise<ConsentDto[]> {
    const recs = await this.consents.listByUser(userId);
    return recs.map(toConsentDto);
  }

  async withdraw(userId: string, id: string): Promise<ConsentDto> {
    const rec = await this.consents.findById(id);
    if (!rec) throw new NotFoundException('Consent not found.');
    if (rec.userId !== userId) throw new ForbiddenException('Not your consent record.');
    if (rec.status === ConsentStatus.WITHDRAWN) {
      throw new BadRequestException('This consent has already been withdrawn.');
    }
    const now = this.clock.now();
    await this.consents.withdraw(id, now);
    await this.audit.record({
      actorUserId: userId,
      eventType: 'consent.withdrawn',
      resource: `consent:${id}`,
      payload: { purpose: rec.purpose },
    });
    return toConsentDto({ ...rec, status: ConsentStatus.WITHDRAWN, withdrawnAt: now });
  }
}
