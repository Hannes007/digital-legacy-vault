import { Role } from '@dlv/shared-types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { AdminService } from './admin.service';

import type { AdminRepository } from './ports';
import type { AuditService } from '../../audit/audit.service';
import type { AuditSearchResultDto, UserSupportSummaryDto } from '@dlv/shared-types';

const audit = { record: async () => undefined } as unknown as AuditService;

function repo(summary: UserSupportSummaryDto | null = null): AdminRepository {
  return {
    searchAudit: async (): Promise<AuditSearchResultDto> => ({ events: [], truncated: false }),
    userSummary: async () => summary,
  };
}

describe('AdminService', () => {
  it('rejects non-privileged roles', async () => {
    const svc = new AdminService(repo(), audit);
    await expect(
      svc.searchAudit({ userId: 'u1', roles: [Role.PREMIUM_USER] }, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a support agent to search the audit trail', async () => {
    const svc = new AdminService(repo(), audit);
    const res = await svc.searchAudit({ userId: 'a1', roles: [Role.SUPPORT_AGENT] }, { eventType: 'login' });
    expect(res.events).toEqual([]);
  });

  it('allows an auditor and 404s an unknown user', async () => {
    const svc = new AdminService(repo(null), audit);
    await expect(
      svc.userSummary({ userId: 'a1', roles: [Role.AUDITOR] }, 'ghost'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
