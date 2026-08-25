import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

import type { PasskeyRegistrationFinish, RegistrationResponseJson } from '@dlv/shared-types';

/** `POST /api/v1/auth/passkeys/registration/verify` body. */
export class PasskeyRegistrationFinishDto implements PasskeyRegistrationFinish {
  @IsObject()
  credential!: RegistrationResponseJson;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceLabel?: string;
}
