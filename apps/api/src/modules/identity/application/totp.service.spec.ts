import { authenticator } from 'otplib';

import {
  InvalidMfaCodeError,
  InvalidMfaTokenError,
  InvalidTotpCodeError,
} from '../domain/errors/identity.errors';

import { TotpService } from './totp.service';

import type { RecoveryCodeRepository, TotpSecretRepository } from './mfa-ports';
import type { EphemeralTokenStore, UserRepository } from './ports';
import type { SessionEstablisher } from './session-establisher';
import type { AuditService } from '../../audit/audit.service';

const NOW = new Date('2026-07-06T12:00:00.000Z');
const ctx = { ip: '1.2.3.4', ipMasked: '1.2.x.x', userAgent: 'jest', deviceLabel: 'Test' };

function build(secret: string) {
  const secrets = {
    findByUser: jest.fn(),
    upsertPending: jest.fn(),
    enable: jest.fn(),
    deleteByUser: jest.fn(),
  } as jest.Mocked<TotpSecretRepository>;
  const recovery = {
    replaceAll: jest.fn(),
    listUnused: jest.fn().mockResolvedValue([]),
    markUsed: jest.fn(),
    deleteByUser: jest.fn(),
  } as jest.Mocked<RecoveryCodeRepository>;
  const users = {
    findById: jest.fn().mockResolvedValue({ id: 'user-1' }),
  } as unknown as jest.Mocked<UserRepository>;
  const tokens = { takeMfa: jest.fn() } as unknown as jest.Mocked<EphemeralTokenStore>;
  // Identity cipher: store/return the secret verbatim for the test.
  const cipher = { encrypt: (p: string) => p, decrypt: (c: string) => c };
  const clock = { now: () => NOW };
  const establisher = {
    establish: jest.fn().mockResolvedValue({ result: { status: 'AUTHENTICATED' } }),
  } as unknown as jest.Mocked<SessionEstablisher>;
  const audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

  secrets.findByUser.mockResolvedValue({ userId: 'user-1', secretEnc: secret, status: 'ENABLED' });
  const service = new TotpService(secrets, recovery, users, tokens, cipher, clock, establisher, audit);
  return { service, secrets, recovery, tokens, establisher };
}

describe('TotpService.verifyLogin', () => {
  it('rejects an unknown/expired MFA token', async () => {
    const { service, tokens } = build(authenticator.generateSecret());
    tokens.takeMfa.mockResolvedValue(null);
    await expect(service.verifyLogin('bad', '000000', ctx)).rejects.toBeInstanceOf(
      InvalidMfaTokenError,
    );
  });

  it('establishes a session on a valid TOTP code (amr pwd+totp)', async () => {
    const secret = authenticator.generateSecret();
    const { service, tokens, establisher } = build(secret);
    tokens.takeMfa.mockResolvedValue('user-1');
    const code = authenticator.generate(secret);

    await service.verifyLogin('mfa-token', code, ctx);

    expect(establisher.establish).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      ['pwd', 'totp'],
      ctx,
    );
  });

  it('rejects a wrong code when no recovery code matches', async () => {
    const { service, tokens } = build(authenticator.generateSecret());
    tokens.takeMfa.mockResolvedValue('user-1');
    await expect(service.verifyLogin('mfa-token', '123456', ctx)).rejects.toBeInstanceOf(
      InvalidMfaCodeError,
    );
  });
});

describe('TotpService.enable', () => {
  it('rejects a wrong confirmation code', async () => {
    const secret = authenticator.generateSecret();
    const { service, secrets } = build(secret);
    secrets.findByUser.mockResolvedValue({ userId: 'user-1', secretEnc: secret, status: 'PENDING' });
    await expect(service.enable('user-1', '000000', '1.2.x.x')).rejects.toBeInstanceOf(
      InvalidTotpCodeError,
    );
  });

  it('activates TOTP and returns 10 one-time recovery codes', async () => {
    const secret = authenticator.generateSecret();
    const { service, secrets, recovery } = build(secret);
    secrets.findByUser.mockResolvedValue({ userId: 'user-1', secretEnc: secret, status: 'PENDING' });

    const { recoveryCodes } = await service.enable('user-1', authenticator.generate(secret), '1.2.x.x');

    expect(recoveryCodes).toHaveLength(10);
    expect(recoveryCodes.every((c) => /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(c))).toBe(true);
    expect(secrets.enable).toHaveBeenCalledWith('user-1', NOW);
    expect(recovery.replaceAll).toHaveBeenCalledWith('user-1', expect.arrayContaining([]));
  });
});
