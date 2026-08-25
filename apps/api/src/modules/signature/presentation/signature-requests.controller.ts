import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';


import { extractRequestContext } from '../../../common/http/request-context';
import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { SignatureCeremonyService } from '../application/signature-ceremony.service';
import { SignatureRequestService } from '../application/signature-request.service';

import { CompleteSignatureDto, CreateSignatureRequestDto } from './dto/signature.dto';

import type { AuthUser, AuthenticatedRequest } from '../../identity/presentation/authenticated-request';
import type { SignatureDto, SignatureRequestDto } from '@dlv/shared-types';

@Controller('signature-requests')
@UseGuards(JwtAuthGuard)
export class SignatureRequestsController {
  constructor(
    private readonly requests: SignatureRequestService,
    private readonly ceremony: SignatureCeremonyService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSignatureRequestDto): Promise<SignatureRequestDto> {
    return this.requests.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<SignatureRequestDto[]> {
    return this.requests.list(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<SignatureRequestDto> {
    return this.requests.get(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.requests.cancel(user.userId, id);
  }

  /** Complete the ceremony: capture signature + consent and seal it (§2.9). */
  @Post(':id/sign')
  @HttpCode(HttpStatus.CREATED)
  sign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CompleteSignatureDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SignatureDto> {
    const ctx = extractRequestContext(req);
    return this.ceremony.complete(user.userId, id, dto, {
      ipMasked: ctx.ipMasked,
      userAgent: ctx.userAgent,
    });
  }
}
