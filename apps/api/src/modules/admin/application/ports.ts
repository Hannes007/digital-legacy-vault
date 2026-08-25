import type { AuditSearchResultDto, UserSupportSummaryDto } from '@dlv/shared-types';

export const ADMIN_REPOSITORY = Symbol('ADMIN_REPOSITORY');

export interface AuditSearchFilter {
  actorUserId?: string | undefined;
  eventType?: string | undefined;
  resource?: string | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  limit: number;
}

export interface AdminRepository {
  searchAudit(filter: AuditSearchFilter): Promise<AuditSearchResultDto>;
  userSummary(userId: string): Promise<UserSupportSummaryDto | null>;
}
