import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import type { PasskeyAuthStart } from '@dlv/shared-types';

/** `POST /api/v1/auth/passkeys/authentication/options` body. */
export class PasskeyAuthStartDto implements PasskeyAuthStart {
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  mfaToken?: string;
}
