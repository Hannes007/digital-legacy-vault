import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { DataSubjectService } from '../application/data-subject.service';

import type { AuthUser } from '../../identity/presentation/authenticated-request';
import type { DataSubjectExportDto, DataSubjectRequestDto, ErasureResultDto } from '@dlv/shared-types';

/**
 * POPIA/GDPR data-subject self-service (Phase 5): a user exports their own data
 * or requests erasure of their own account. Erasure is refused while a legal
 * hold applies.
 */
@Controller('data-subject')
@UseGuards(JwtAuthGuard)
export class DataSubjectController {
  constructor(private readonly dsr: DataSubjectService) {}

  @Get('export')
  export(@CurrentUser() user: AuthUser): Promise<DataSubjectExportDto> {
    return this.dsr.exportData(user.userId);
  }

  @Post('erasure')
  @HttpCode(HttpStatus.OK)
  erase(@CurrentUser() user: AuthUser): Promise<ErasureResultDto> {
    return this.dsr.requestErasure(user.userId);
  }

  @Get('requests')
  requests(@CurrentUser() user: AuthUser): Promise<DataSubjectRequestDto[]> {
    return this.dsr.listRequests(user.userId);
  }
}
