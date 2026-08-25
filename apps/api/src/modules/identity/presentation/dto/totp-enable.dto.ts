import { Matches } from 'class-validator';

/** `POST /api/v1/auth/totp/enable` body — the 6-digit code from the authenticator app. */
export class TotpEnableDto {
  @Matches(/^\d{6}$/, { message: 'must be a 6-digit code' })
  code!: string;
}
