import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';

import type { BeneficiaryDto } from '@dlv/shared-types';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { BeneficiaryService } from '../application/beneficiary.service';
import { CreateBeneficiaryDto } from './dto/estate.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard)
export class BeneficiariesController {
  constructor(private readonly beneficiaries: BeneficiaryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBeneficiaryDto): Promise<BeneficiaryDto> {
    return this.beneficiaries.add(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<BeneficiaryDto[]> {
    return this.beneficiaries.list(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.beneficiaries.remove(user.userId, id);
  }
}
