import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';

import type { EmergencyAccessGrantDto, EmergencyAccessRequestDto } from '@dlv/shared-types';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { EmergencyAccessService } from '../application/emergency-access.service';
import { ApproveEmergencyDto, CreateEmergencyDto } from './dto/estate.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

/** Emergency access (multi-party quorum + time delay + owner notification, §7.6). */
@Controller('emergency-access')
@UseGuards(JwtAuthGuard)
export class EmergencyAccessController {
  constructor(private readonly emergency: EmergencyAccessService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  request(@CurrentUser() user: AuthUser, @Body() dto: CreateEmergencyDto): Promise<EmergencyAccessRequestDto> {
    return this.emergency.request(user.userId, dto);
  }

  @Get()
  listMine(@CurrentUser() user: AuthUser): Promise<EmergencyAccessRequestDto[]> {
    return this.emergency.listForOwner(user.userId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async approve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ApproveEmergencyDto,
  ): Promise<void> {
    await this.emergency.approve(user.userId, user.roles, id, dto.medical ?? false);
  }

  @Post(':id/activate')
  activate(@CurrentUser() _user: AuthUser, @Param('id') id: string): Promise<EmergencyAccessGrantDto> {
    return this.emergency.tryActivate(id);
  }

  @Post(':id/deny')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deny(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.emergency.deny(user.userId, id);
  }
}
