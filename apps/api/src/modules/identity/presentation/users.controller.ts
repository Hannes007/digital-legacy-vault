import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';


import { extractRequestContext } from '../../../common/http/request-context';
import { SessionService } from '../application/session.service';

import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

import type { AuthUser } from './authenticated-request';
import type { SessionDto } from '@dlv/shared-types';
import type { Request } from 'express';

/** Current-user session management (`/api/v1/users/me/sessions`). */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly sessions: SessionService) {}

  @Get('me/sessions')
  async listSessions(@CurrentUser() user: AuthUser): Promise<SessionDto[]> {
    return this.sessions.list(user.userId, user.sessionId);
  }

  @Delete('me/sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.sessions.revoke(user.userId, id, extractRequestContext(req).ipMasked);
  }
}
