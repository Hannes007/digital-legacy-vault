import { Role, type AuditSearchResultDto, type UserSupportSummaryDto } from '@dlv/shared-types';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../audit/audit.service';

import { ADMIN_REPOSITORY, type AdminRepository, type AuditSearchFilter } from './ports';

/** Roles permitted to use the back-office (read-only support + audit). */
const BACK_OFFICE_ROLES: readonly Role[] = [
  Role.SUPPORT_AGENT,
  Role.AUDITOR,
  Role.SYSTEM_ADMIN,
  Role.SUPER_ADMIN,
];

/** Max audit rows returned per search. */
const MAX_LIMIT = 200;

/**
 * Admin back-office v1 (Phase 6): role-gated audit-trail search and a per-user
 * support summary. Read-only; every lookup is itself audited (break-glass trail).
 */
@Injectable()
export class AdminService {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly repo: AdminRepository,
    private readonly audit: AuditService,
  ) {}

  async searchAudit(
    actor: { userId: string; roles: Role[] },
    query: { actorUserId?: string | undefined; eventType?: string | undefined; resource?: string | undefined; from?: string | undefined; to?: string | undefined; limit?: number | undefined },
  ): Promise<AuditSearchResultDto> {
    this.assertRole(actor.roles);
    const filter: AuditSearchFilter = {
      actorUserId: query.actorUserId,
      eventType: query.eventType,
      resource: query.resource,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: Math.min(Math.max(query.limit ?? 50, 1), MAX_LIMIT),
    };
    const result = await this.repo.searchAudit(filter);
    await this.audit.record({
      actorUserId: actor.userId,
      eventType: 'admin.audit.searched',
      resource: 'audit',
      payload: { eventType: filter.eventType ?? null, resource: filter.resource ?? null, results: result.events.length },
    });
    return result;
  }

  async userSummary(actor: { userId: string; roles: Role[] }, userId: string): Promise<UserSupportSummaryDto> {
    this.assertRole(actor.roles);
    const summary = await this.repo.userSummary(userId);
    if (!summary) throw new NotFoundException('User not found.');
    await this.audit.record({
      actorUserId: actor.userId,
      eventType: 'admin.user.viewed',
      resource: `user:${userId}`,
      payload: {},
    });
    return summary;
  }

  private assertRole(roles: Role[]): void {
    if (!roles.some((r) => BACK_OFFICE_ROLES.includes(r))) {
      throw new ForbiddenException('Back-office access is restricted to support and platform roles.');
    }
  }
}
