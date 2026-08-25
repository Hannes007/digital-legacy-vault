import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';

import type { SecureLinkDto } from '@dlv/shared-types';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { SecureLinkService, type ResolvedLink } from '../application/secure-link.service';
import { CreateSecureLinkDto } from './dto/sharing.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

@Controller('secure-links')
@UseGuards(JwtAuthGuard)
export class SecureLinksController {
  constructor(private readonly links: SecureLinkService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSecureLinkDto): Promise<SecureLinkDto> {
    return this.links.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<SecureLinkDto[]> {
    return this.links.list(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.links.revoke(user.userId, id);
  }
}

/** Public resolution of a shared link (no auth — the token is the credential). */
@Controller('public/secure-links')
export class PublicSecureLinksController {
  constructor(private readonly links: SecureLinkService) {}

  @Get('resolve/:token')
  resolve(@Param('token') token: string): Promise<ResolvedLink> {
    return this.links.resolve(token);
  }
}
