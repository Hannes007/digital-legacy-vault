import { IsString, MaxLength, MinLength } from 'class-validator';

/** `DELETE /api/v1/auth/totp` body — fresh password re-check to disable TOTP. */
export class DisableTotpDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
