import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { extractRequestContext } from '../../../common/http/request-context';
import { ENV } from '../../../common/tokens';
import { SsoService } from '../application/sso.service';

import { REFRESH_COOKIE_NAME, refreshCookieOptions } from './auth-cookie';
import { CurrentUser } from './current-user.decorator';
import { SsoCallbackDto, SsoStartQueryDto, UpsertSsoConnectionDto } from './dto/sso.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

import type { AuthUser } from './authenticated-request';
import type { RefreshCookieInstruction } from '../application/auth-outcomes';
import type { Env } from '@dlv/config';
import type { LoginResultDto, SsoConnectionDto, SsoStartDto } from '@dlv/shared-types';
import type { Request, Response } from 'express';

const MINUTE = 60_000;

/** Enterprise SSO endpoints (Phase 8): login flow + org-admin configuration. */
@Controller()
export class SsoController {
  constructor(
    private readonly sso: SsoService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get('auth/sso/start')
  @Throttle({ default: { limit: 20, ttl: MINUTE } })
  start(@Query() query: SsoStartQueryDto): Promise<SsoStartDto> {
    return this.sso.start(query.email);
  }

  @Post('auth/sso/callback')
  @Throttle({ default: { limit: 20, ttl: MINUTE } })
  async callback(
    @Body() body: SsoCallbackDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResultDto> {
    const outcome = await this.sso.callback(body.code, body.state, extractRequestContext(req));
    if (outcome.refresh) this.setRefreshCookie(res, outcome.refresh);
    return outcome.result;
  }

  @Get('organisations/:orgId/sso')
  @UseGuards(JwtAuthGuard)
  getConnection(
    @CurrentUser() user: AuthUser,
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<SsoConnectionDto> {
    return this.sso.getConnection(orgId, user.userId);
  }

  @Put('organisations/:orgId/sso')
  @UseGuards(JwtAuthGuard)
  upsertConnection(
    @CurrentUser() user: AuthUser,
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() body: UpsertSsoConnectionDto,
  ): Promise<SsoConnectionDto> {
    return this.sso.upsertConnection(orgId, user.userId, body);
  }

  private setRefreshCookie(res: Response, instruction: RefreshCookieInstruction): void {
    res.cookie(
      REFRESH_COOKIE_NAME,
      instruction.token,
      refreshCookieOptions(this.env, instruction.maxAgeSeconds),
    );
  }
}
