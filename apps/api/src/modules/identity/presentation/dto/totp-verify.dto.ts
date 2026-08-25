import { IsString, MaxLength, MinLength } from 'class-validator';

import type { TotpVerifyRequest } from '@dlv/shared-types';

/** `POST /api/v1/auth/mfa/totp/verify` body. `code` accepts a 6-digit TOTP or a recovery code. */
export class TotpVerifyDto implements TotpVerifyRequest {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  mfaToken!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  code!: string;
}
