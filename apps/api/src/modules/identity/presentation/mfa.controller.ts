import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';


import { extractRequestContext } from '../../../common/http/request-context';
import { ENV } from '../../../common/tokens';
import { PasskeyService, type PasskeyDto } from '../application/passkey.service';
import { TotpService } from '../application/totp.service';

import { REFRESH_COOKIE_NAME, refreshCookieOptions } from './auth-cookie';
import { CurrentUser } from './current-user.decorator';
import { DisableTotpDto } from './dto/disable-totp.dto';
import { PasskeyAuthFinishDto } from './dto/passkey-auth-finish.dto';
import { PasskeyAuthStartDto } from './dto/passkey-auth-start.dto';
import { PasskeyRegistrationFinishDto } from './dto/passkey-registration-finish.dto';
import { TotpEnableDto } from './dto/totp-enable.dto';
import { TotpVerifyDto } from './dto/totp-verify.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

import type { AuthUser } from './authenticated-request';
import type { RefreshCookieInstruction } from '../application/auth-outcomes';
import type { Env } from '@dlv/config';
import type {
  LoginResultDto,
  PublicKeyCredentialCreationOptionsJson,
  PublicKeyCredentialRequestOptionsJson,
} from '@dlv/shared-types';
import type { Request, Response } from 'express';

const MINUTE = 60_000;

/**
 * TOTP and WebAuthn passkey endpoints (phase-2-contracts). The two public
 * "verify" ceremonies complete a login and therefore set the `dlv_rt` cookie,
 * exactly like `POST /auth/login`.
 */
@Controller('auth')
export class MfaController {
  constructor(
    private readonly totp: TotpService,
    private readonly passkeys: PasskeyService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // ---- TOTP -------------------------------------------------------------

  @Post('mfa/totp/verify')
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @HttpCode(HttpStatus.OK)
  async totpVerify(
    @Body() dto: TotpVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResultDto> {
    const outcome = await this.totp.verifyLogin(dto.mfaToken, dto.code, extractRequestContext(req));
    if (outcome.refresh) {
      this.setRefreshCookie(res, outcome.refresh);
    }
    return outcome.result;
  }

  @Post('totp/setup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async totpSetup(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<{ otpauthUrl: string; secretMasked: string }> {
    return this.totp.setup(user.userId, extractRequestContext(req).ipMasked);
  }

  @Post('totp/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async totpEnable(
    @CurrentUser() user: AuthUser,
    @Body() dto: TotpEnableDto,
    @Req() req: Request,
  ): Promise<{ recoveryCodes: string[] }> {
    return this.totp.enable(user.userId, dto.code, extractRequestContext(req).ipMasked);
  }

  @Delete('totp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async totpDisable(
    @CurrentUser() user: AuthUser,
    @Body() dto: DisableTotpDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.totp.disable(user.userId, dto.password, extractRequestContext(req).ipMasked);
  }

  // ---- Passkeys ---------------------------------------------------------

  @Post('passkeys/registration/options')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async passkeyRegistrationOptions(
    @CurrentUser() user: AuthUser,
  ): Promise<PublicKeyCredentialCreationOptionsJson> {
    return this.passkeys.registrationOptions(user.userId);
  }

  @Post('passkeys/registration/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async passkeyRegistrationVerify(
    @CurrentUser() user: AuthUser,
    @Body() dto: PasskeyRegistrationFinishDto,
    @Req() req: Request,
  ): Promise<{ status: 'ok' }> {
    await this.passkeys.registrationVerify(
      user.userId,
      dto.credential,
      dto.deviceLabel,
      extractRequestContext(req).ipMasked,
    );
    return { status: 'ok' };
  }

  @Post('passkeys/authentication/options')
  @Throttle({ default: { limit: 20, ttl: MINUTE } })
  @HttpCode(HttpStatus.OK)
  async passkeyAuthenticationOptions(
    @Body() dto: PasskeyAuthStartDto,
  ): Promise<PublicKeyCredentialRequestOptionsJson> {
    return this.passkeys.authenticationOptions(dto.email);
  }

  @Post('passkeys/authentication/verify')
  @Throttle({ default: { limit: 20, ttl: MINUTE } })
  @HttpCode(HttpStatus.OK)
  async passkeyAuthenticationVerify(
    @Body() dto: PasskeyAuthFinishDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResultDto> {
    const outcome = await this.passkeys.authenticationVerify(
      dto.credential,
      dto.mfaToken,
      extractRequestContext(req),
    );
    if (outcome.refresh) {
      this.setRefreshCookie(res, outcome.refresh);
    }
    return outcome.result;
  }

  @Get('passkeys')
  @UseGuards(JwtAuthGuard)
  async listPasskeys(@CurrentUser() user: AuthUser): Promise<PasskeyDto[]> {
    return this.passkeys.list(user.userId);
  }

  @Delete('passkeys/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePasskey(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.passkeys.remove(user.userId, id, extractRequestContext(req).ipMasked);
  }

  private setRefreshCookie(res: Response, instruction: RefreshCookieInstruction): void {
    res.cookie(
      REFRESH_COOKIE_NAME,
      instruction.token,
      refreshCookieOptions(this.env, instruction.maxAgeSeconds),
    );
  }
}
