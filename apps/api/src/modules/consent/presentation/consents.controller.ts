import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';

import { extractRequestContext } from '../../../common/http/request-context';
import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { ConsentService } from '../application/consent.service';

import { RecordConsentDto } from './dto/consent.dto';

import type { AuthUser, AuthenticatedRequest } from '../../identity/presentation/authenticated-request';
import type { ConsentDto } from '@dlv/shared-types';

@Controller('consents')
@UseGuards(JwtAuthGuard)
export class ConsentsController {
  constructor(private readonly consents: ConsentService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ConsentDto[]> {
    return this.consents.list(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  record(
    @CurrentUser() user: AuthUser,
    @Body() dto: RecordConsentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConsentDto> {
    const ctx = extractRequestContext(req);
    return this.consents.grant(user.userId, dto, { ipMasked: ctx.ipMasked, userAgent: ctx.userAgent });
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  withdraw(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<ConsentDto> {
    return this.consents.withdraw(user.userId, id);
  }
}
