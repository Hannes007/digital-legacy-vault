import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';


import { extractRequestContext } from '../../../common/http/request-context';
import { ENV } from '../../../common/tokens';
import { EmailVerificationService } from '../application/email-verification.service';
import { toUserDto } from '../application/identity.mapper';
import { LoginService } from '../application/login.service';
import { LogoutService } from '../application/logout.service';
import { USER_REPOSITORY, type UserRepository } from '../application/ports';
import { RefreshService } from '../application/refresh.service';
import { RegistrationService } from '../application/registration.service';
import { UserNotFoundError } from '../domain/errors/identity.errors';

import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookieOptions,
  refreshCookieOptions,
} from './auth-cookie';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

import type { AuthUser } from './authenticated-request';
import type { RefreshCookieInstruction } from '../application/auth-outcomes';
import type { Env } from '@dlv/config';
import type { AuthTokensDto, LoginResultDto, UserDto } from '@dlv/shared-types';
import type { Request, Response } from 'express';

/** One minute / one hour, in milliseconds (@nestjs/throttler v6 uses ms). */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Authentication endpoints (phase-2-contracts API surface). All errors leave as
 * RFC 9457 problem+json via the global filter. The refresh token lives ONLY in
 * the httpOnly `dlv_rt` cookie and never appears in a response body.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registration: RegistrationService,
    private readonly emailVerification: EmailVerificationService,
    private readonly login: LoginService,
    private readonly refreshService: RefreshService,
    private readonly logoutService: LogoutService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: HOUR } })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<UserDto> {
    const ctx = extractRequestContext(req);
    return this.registration.register(dto, { ipMasked: ctx.ipMasked });
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request): Promise<void> {
    const ctx = extractRequestContext(req);
    await this.emailVerification.verify(dto.token, { ipMasked: ctx.ipMasked });
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  @HttpCode(HttpStatus.OK)
  async loginHandler(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResultDto> {
    const outcome = await this.login.login(dto, extractRequestContext(req));
    if (outcome.refresh) {
      this.setRefreshCookie(res, outcome.refresh);
    }
    return outcome.result;
  }

  @Post('refresh')
  @Throttle({ default: { limit: 60, ttl: HOUR } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensDto> {
    const raw = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
    const outcome = await this.refreshService.refresh(raw, extractRequestContext(req));
    this.setRefreshCookie(res, outcome.refresh);
    return outcome.tokens;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const ctx = extractRequestContext(req);
    await this.logoutService.logout(user.sessionId, user.userId, ctx.ipMasked);
    res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions(this.env));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() principal: AuthUser): Promise<UserDto> {
    const user = await this.users.findById(principal.userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return toUserDto(user);
  }

  private setRefreshCookie(res: Response, instruction: RefreshCookieInstruction): void {
    res.cookie(
      REFRESH_COOKIE_NAME,
      instruction.token,
      refreshCookieOptions(this.env, instruction.maxAgeSeconds),
    );
  }
}
