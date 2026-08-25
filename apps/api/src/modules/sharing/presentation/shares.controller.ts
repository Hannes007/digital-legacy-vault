import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';

import type { DocumentShareDto } from '@dlv/shared-types';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { ShareService } from '../application/share.service';
import { CreateShareDto } from './dto/sharing.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

@Controller('shares')
@UseGuards(JwtAuthGuard)
export class SharesController {
  constructor(private readonly shares: ShareService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShareDto): Promise<DocumentShareDto> {
    return this.shares.share(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<DocumentShareDto[]> {
    return this.shares.list(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.shares.revoke(user.userId, id);
  }
}
