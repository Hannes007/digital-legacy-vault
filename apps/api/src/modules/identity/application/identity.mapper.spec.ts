import { Role } from '@dlv/shared-types';

import { toUserDto } from './identity.mapper';

import type { UserRecord } from './ports';

function baseUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: '018f-user',
    email: 'jane@example.com',
    emailVerifiedAt: null,
    firstName: 'Jane',
    lastName: 'Doe',
    status: 'PENDING_VERIFICATION',
    roles: [Role.REGISTERED_USER],
    passkeyCount: 0,
    totpEnabled: false,
    passwordHash: '$argon2id$...',
    createdAt: new Date('2026-07-06T12:00:00.000Z'),
    ...overrides,
  };
}

describe('toUserDto', () => {
  it('never leaks credentials and maps public fields', () => {
    const dto = toUserDto(baseUser());
    expect(dto).toEqual({
      id: '018f-user',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      roles: [Role.REGISTERED_USER],
      emailVerified: false,
      mfaEnabled: false,
      passkeyCount: 0,
      createdAt: '2026-07-06T12:00:00.000Z',
    });
    expect(Object.keys(dto)).not.toContain('passwordHash');
  });

  it('reports emailVerified once verification has completed', () => {
    const dto = toUserDto(baseUser({ emailVerifiedAt: new Date(), status: 'ACTIVE' }));
    expect(dto.emailVerified).toBe(true);
  });

  it('derives mfaEnabled from TOTP', () => {
    expect(toUserDto(baseUser({ totpEnabled: true })).mfaEnabled).toBe(true);
  });

  it('derives mfaEnabled from having at least one passkey', () => {
    const dto = toUserDto(baseUser({ passkeyCount: 2 }));
    expect(dto.mfaEnabled).toBe(true);
    expect(dto.passkeyCount).toBe(2);
  });
});
