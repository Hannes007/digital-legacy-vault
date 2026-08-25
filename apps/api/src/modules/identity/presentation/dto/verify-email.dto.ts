import { IsString, MaxLength, MinLength } from 'class-validator';

/** `POST /api/v1/auth/verify-email` body. */
export class VerifyEmailDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token!: string;
}
