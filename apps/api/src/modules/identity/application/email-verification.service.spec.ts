import { InvalidVerificationTokenError } from '../domain/errors/identity.errors';

import { EmailVerificationService } from './email-verification.service';

import type { EphemeralTokenStore, UserRepository } from './ports';
import type { AuditService } from '../../audit/audit.service';

function build() {
  const tokens = {
    putEmailVerification: jest.fn(),
    takeEmailVerification: jest.fn(),
    putMfa: jest.fn(),
    takeMfa: jest.fn(),
  } as jest.Mocked<EphemeralTokenStore>;
  const users = { markEmailVerified: jest.fn() } as unknown as jest.Mocked<UserRepository>;
  const audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
  return { service: new EmailVerificationService(tokens, users, audit), tokens, users, audit };
}

describe('EmailVerificationService', () => {
  it('consumes a valid token and marks the email verified', async () => {
    const { service, tokens, users, audit } = build();
    tokens.takeEmailVerification.mockResolvedValue('user-1');

    await service.verify('a'.repeat(43), { ipMasked: '1.2.x.x' });

    expect(users.markEmailVerified).toHaveBeenCalledWith('user-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'user.email_verified', actorUserId: 'user-1' }),
    );
  });

  it('rejects an unknown/expired/used token and changes nothing', async () => {
    const { service, tokens, users } = build();
    tokens.takeEmailVerification.mockResolvedValue(null);

    await expect(service.verify('bad', { ipMasked: '1.2.x.x' })).rejects.toBeInstanceOf(
      InvalidVerificationTokenError,
    );
    expect(users.markEmailVerified).not.toHaveBeenCalled();
  });
});
