import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

import type { RegisterRequest } from '@dlv/shared-types';

/**
 * `POST /api/v1/auth/register` body. Implements the shared `RegisterRequest`
 * contract; password policy (min 12 chars) is enforced here at the boundary.
 */
export class RegisterDto implements RegisterRequest {
  @IsEmail({}, { message: 'must be a valid email address' })
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(12, { message: 'must be at least 12 characters' })
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;
}
