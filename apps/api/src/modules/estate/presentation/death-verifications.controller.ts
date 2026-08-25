import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';

import type { DeathVerificationDto } from '@dlv/shared-types';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { DeathVerificationService } from '../application/death-verification.service';
import { ReviewDeathVerificationDto, SubmitDeathVerificationDto } from './dto/estate.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

@Controller('death-verifications')
@UseGuards(JwtAuthGuard)
export class DeathVerificationsController {
  constructor(private readonly deaths: DeathVerificationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitDeathVerificationDto): Promise<DeathVerificationDto> {
    return this.deaths.submit(user.userId, dto.subjectUserId, dto.evidenceDocIds);
  }

  @Get('pending')
  pending(@CurrentUser() user: AuthUser): Promise<DeathVerificationDto[]> {
    return this.deaths.listPending(user.roles);
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.NO_CONTENT)
  async review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewDeathVerificationDto,
  ): Promise<void> {
    await this.deaths.review(user.userId, user.roles, id, dto.approve, dto.notes ?? null);
  }
}
