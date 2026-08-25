import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';

import { LegalHoldStatus, type LegalHoldDto } from '@dlv/shared-types';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { LegalHoldService } from '../application/legal-hold.service';

import { PlaceLegalHoldDto } from './dto/legal-hold.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

/** Compliance-role admin surface for legal holds (Phase 5). */
@Controller('legal-holds')
@UseGuards(JwtAuthGuard)
export class LegalHoldsController {
  constructor(private readonly holds: LegalHoldService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('status') status?: LegalHoldStatus): Promise<LegalHoldDto[]> {
    return this.holds.list({ roles: user.roles }, status);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  place(@CurrentUser() user: AuthUser, @Body() dto: PlaceLegalHoldDto): Promise<LegalHoldDto> {
    return this.holds.place({ userId: user.userId, roles: user.roles }, dto);
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  release(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<LegalHoldDto> {
    return this.holds.release({ userId: user.userId, roles: user.roles }, id);
  }
}
