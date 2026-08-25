import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { AdminService } from '../application/admin.service';

import type { AuthUser } from '../../identity/presentation/authenticated-request';
import type { AuditSearchResultDto, UserSupportSummaryDto } from '@dlv/shared-types';

/** Back-office API (Phase 6). Access is role-gated inside AdminService. */
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('audit')
  searchAudit(
    @CurrentUser() user: AuthUser,
    @Query('actorUserId') actorUserId?: string,
    @Query('eventType') eventType?: string,
    @Query('resource') resource?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ): Promise<AuditSearchResultDto> {
    return this.admin.searchAudit(
      { userId: user.userId, roles: user.roles },
      { actorUserId, eventType, resource, from, to, limit: limit ? Number(limit) : undefined },
    );
  }

  @Get('users/:id')
  userSummary(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<UserSupportSummaryDto> {
    return this.admin.userSummary({ userId: user.userId, roles: user.roles }, id);
  }
}
