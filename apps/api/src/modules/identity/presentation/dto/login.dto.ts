import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

import type { LoginRequest } from '@dlv/shared-types';

/** `POST /api/v1/auth/login` body. */
export class LoginDto implements LoginRequest {
  @IsEmail({}, { message: 'must be a valid email address' })
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
