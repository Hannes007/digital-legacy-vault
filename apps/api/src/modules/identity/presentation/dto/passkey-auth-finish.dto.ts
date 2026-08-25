import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import type { AuthenticationResponseJson, PasskeyAuthFinish } from '@dlv/shared-types';

/** `POST /api/v1/auth/passkeys/authentication/verify` body. */
export class PasskeyAuthFinishDto implements PasskeyAuthFinish {
  @IsObject()
  credential!: AuthenticationResponseJson;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  mfaToken?: string;
}
