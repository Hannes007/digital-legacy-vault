import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { EmergencyScope, EmergencyStatus, type EmergencyAccessRequestDto, type EmergencyAccessGrantDto } from '@dlv/shared-types';

import { AuditService } from '../../audit/audit.service';
import { CLOCK } from '../../../common/tokens';
import {
  canActivate,
  canApprove,
  computeDelayUntil,
  GRANT_DURATION_DAYS,
} from '../domain/emergency-policy';
import {
  EMERGENCY_REPOSITORY,
  NOTIFICATION_PORT,
  type EmergencyGrantRecord,
  type EmergencyRepository,
  type EmergencyRequestRecord,
  type NotificationPort,
} from './ports';

import type { Clock } from '../../../common/time/clock';

@Injectable()
export class EmergencyAccessService {
  constructor(
    @Inject(EMERGENCY_REPOSITORY) private readonly repo: EmergencyRepository,
    @Inject(NOTIFICATION_PORT) private readonly notify: NotificationPort,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async request(
    requesterId: string,
    input: { ownerId: string; scope?: EmergencyScope; categoryIds?: string[]; reason: string; isDeathClaim?: boolean },
  ): Promise<EmergencyAccessRequestDto> {
    if (requesterId === input.ownerId) throw new BadRequestException('Cannot request emergency access to your own vault.');
    const now = this.clock.now();
    const scope = input.scope ?? EmergencyScope.FULL;
    const isDeathClaim = input.isDeathClaim ?? false;
    const delayUntil = computeDelayUntil(now, { isDeathClaim, scope });

    const record = await this.repo.createRequest({
      id: uuidv7(),
      ownerId: input.ownerId,
      requesterId,
      scope,
      categoryIds: input.categoryIds ?? [],
      reason: input.reason,
      isDeathClaim,
      status: EmergencyStatus.REQUESTED,
      delayUntil,
    });

    // Owner is always notified of an emergency request (non-disableable, §7.6).
    await this.notify.notifyOwner(input.ownerId, 'emergency_access.requested', {
      requestId: record.id, requesterId, scope, isDeathClaim,
    });
    await this.audit.record({
      actorUserId: requesterId,
      eventType: 'emergency_access.requested',
      resource: `user:${input.ownerId}`,
      payload: { requestId: record.id, scope, isDeathClaim, delayUntil: delayUntil.toISOString() },
    });
    return toRequestDto(record, 0);
  }

  async approve(approverId: string, approverRoles: string[], requestId: string, medical: boolean): Promise<void> {
    const req = await this.mustBeOpen(requestId);
    const approvals = await this.repo.listApprovals(requestId);
    const check = canApprove(req.requesterId, approverId, approverRoles, approvals);
    if (!check.ok) throw new ForbiddenException(check.reason);

    await this.repo.addApproval(requestId, approverId, medical);
    await this.repo.setRequestStatus(requestId, EmergencyStatus.APPROVED);
    await this.notify.notifyOwner(req.ownerId, 'emergency_access.approval_added', { requestId, approverId });
    await this.audit.record({
      actorUserId: approverId,
      eventType: 'emergency_access.approved',
      resource: `user:${req.ownerId}`,
      payload: { requestId, medical },
    });
  }

  /** Attempt activation; creates a read-only, time-boxed, scoped grant when all rules are met. */
  async tryActivate(requestId: string): Promise<EmergencyAccessGrantDto> {
    const req = await this.mustBeOpen(requestId);
    const approvals = await this.repo.listApprovals(requestId);
    const now = this.clock.now();
    const decision = canActivate({ scope: req.scope, delayUntil: req.delayUntil, approvals, now });
    if (!decision.ok) throw new BadRequestException(decision.reason);

    const grant = await this.repo.createGrant({
      id: uuidv7(),
      requestId: req.id,
      granteeId: req.requesterId,
      ownerId: req.ownerId,
      scope: req.scope,
      categoryIds: req.categoryIds,
      expiresAt: new Date(now.getTime() + GRANT_DURATION_DAYS * 86_400_000),
    });
    await this.repo.setRequestStatus(requestId, EmergencyStatus.ACTIVE);
    await this.notify.notifyOwner(req.ownerId, 'emergency_access.activated', { requestId, grantId: grant.id });
    await this.audit.record({
      actorUserId: req.requesterId,
      eventType: 'emergency_access.activated',
      resource: `user:${req.ownerId}`,
      payload: { requestId, grantId: grant.id, expiresAt: grant.expiresAt.toISOString() },
    });
    return toGrantDto(grant);
  }

  async deny(ownerId: string, requestId: string): Promise<void> {
    const req = await this.repo.findRequest(requestId);
    if (!req) throw new NotFoundException('Request not found.');
    if (req.ownerId !== ownerId) throw new ForbiddenException('Only the vault owner can deny.');
    await this.repo.setRequestStatus(requestId, EmergencyStatus.DENIED);
    await this.audit.record({
      actorUserId: ownerId,
      eventType: 'emergency_access.denied',
      resource: `user:${ownerId}`,
      payload: { requestId },
    });
  }

  async listForOwner(ownerId: string): Promise<EmergencyAccessRequestDto[]> {
    const reqs = await this.repo.listRequestsForOwner(ownerId);
    return Promise.all(
      reqs.map(async (r) => toRequestDto(r, (await this.repo.listApprovals(r.id)).length)),
    );
  }

  private async mustBeOpen(requestId: string): Promise<EmergencyRequestRecord> {
    const req = await this.repo.findRequest(requestId);
    if (!req) throw new NotFoundException('Request not found.');
    if ([EmergencyStatus.DENIED, EmergencyStatus.CANCELLED, EmergencyStatus.EXPIRED].includes(req.status)) {
      throw new BadRequestException(`Request is ${req.status}.`);
    }
    return req;
  }
}

function toRequestDto(r: EmergencyRequestRecord, approvalCount: number): EmergencyAccessRequestDto {
  return {
    id: r.id, ownerId: r.ownerId, requesterId: r.requesterId, scope: r.scope, categoryIds: r.categoryIds,
    reason: r.reason, isDeathClaim: r.isDeathClaim, status: r.status, delayUntil: r.delayUntil.toISOString(),
    approvalCount, createdAt: r.createdAt.toISOString(),
  };
}
function toGrantDto(g: EmergencyGrantRecord): EmergencyAccessGrantDto {
  return {
    id: g.id, requestId: g.requestId, granteeId: g.granteeId, ownerId: g.ownerId, scope: g.scope,
    categoryIds: g.categoryIds, expiresAt: g.expiresAt.toISOString(), revokedAt: g.revokedAt ? g.revokedAt.toISOString() : null,
    createdAt: new Date().toISOString(),
  };
}
