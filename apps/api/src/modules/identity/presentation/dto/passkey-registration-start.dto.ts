import { IsOptional, IsString, MaxLength } from 'class-validator';

import type { PasskeyRegistrationStart } from '@dlv/shared-types';

/** `POST /api/v1/auth/passkeys/registration/options` body. */
export class PasskeyRegistrationStartDto implements PasskeyRegistrationStart {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceLabel?: string;
}
