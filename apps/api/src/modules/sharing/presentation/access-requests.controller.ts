import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';

import type { AccessRequestDto } from '@dlv/shared-types';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { AccessRequestService } from '../application/access-request.service';
import { CreateAccessRequestDto } from './dto/sharing.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

@Controller('access-requests')
@UseGuards(JwtAuthGuard)
export class AccessRequestsController {
  constructor(private readonly requests: AccessRequestService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAccessRequestDto): Promise<AccessRequestDto> {
    return this.requests.request(user.userId, dto.documentId, dto.message ?? null);
  }

  @Get()
  inbox(@CurrentUser() user: AuthUser): Promise<AccessRequestDto[]> {
    return this.requests.listForOwner(user.userId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async approve(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.requests.decide(user.userId, id, true);
  }

  @Post(':id/deny')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deny(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.requests.decide(user.userId, id, false);
  }
}
