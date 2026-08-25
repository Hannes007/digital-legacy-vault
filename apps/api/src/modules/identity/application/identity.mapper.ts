import type { UserRecord } from './ports';
import type { UserDto } from '@dlv/shared-types';


/**
 * Maps the internal {@link UserRecord} to the public {@link UserDto}.
 *
 * The single place this translation happens, so credentials, TOTP secrets and
 * internal status never leak into an API response. `mfaEnabled` is derived:
 * true when TOTP is confirmed OR at least one passkey exists.
 */
export function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    emailVerified: user.emailVerifiedAt !== null,
    mfaEnabled: user.totpEnabled || user.passkeyCount > 0,
    passkeyCount: user.passkeyCount,
    createdAt: user.createdAt.toISOString(),
  };
}
