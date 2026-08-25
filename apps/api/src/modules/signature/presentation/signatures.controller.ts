import { Controller, Get, Param, UseGuards } from '@nestjs/common';


import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { SealVerificationService } from '../application/seal-verification.service';

import type { AuthUser } from '../../identity/presentation/authenticated-request';
import type { SealVerificationDto } from '@dlv/shared-types';

@Controller('signatures')
@UseGuards(JwtAuthGuard)
export class SignaturesController {
  constructor(private readonly verification: SealVerificationService) {}

  /** Independently re-verify a signature seal (roadmap Phase 5 exit tool). */
  @Get(':id/verification')
  verify(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<SealVerificationDto> {
    return this.verification.verify(user.userId, user.roles, id);
  }
}
