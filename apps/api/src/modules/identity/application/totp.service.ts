import { generateOpaqueToken, hashPassword, verifyPassword } from '@dlv/crypto';
import { Inject, Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { uuidv7 } from 'uuidv7';

import { CLOCK, FIELD_CIPHER } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import {
  InvalidCredentialsError,
  InvalidMfaCodeError,
  InvalidMfaTokenError,
  InvalidTotpCodeError,
  TotpAlreadyEnabledError,
  TotpNotConfiguredError,
  UserNotFoundError,
} from '../domain/errors/identity.errors';

import {
  RECOVERY_CODE_REPOSITORY,
  TOTP_SECRET_REPOSITORY,
  type RecoveryCodeRepository,
  type TotpSecretRepository,
} from './mfa-ports';
import {
  EPHEMERAL_TOKEN_STORE,
  USER_REPOSITORY,
  type EphemeralTokenStore,
  type UserRepository,
} from './ports';
import { SessionEstablisher } from './session-establisher';

import type { AuthOutcome } from './auth-outcomes';
import type { RequestContext } from '../../../common/http/request-context';
import type { Clock } from '../../../common/time/clock';
import type { FieldCipher } from '@dlv/crypto';

const TOTP_ISSUER = 'Digital Legacy Vault';
const RECOVERY_CODE_COUNT = 10;

/** AAD binding a stored TOTP secret to its owning user (schema §totp_secrets). */
function totpAad(userId: string): string {
  return `totp:${userId}`;
}

/** Human-readable partial secret for the setup response (never the full secret twice). */
function maskSecret(secret: string): string {
  return `${secret.slice(0, 4)}${'•'.repeat(Math.max(0, secret.length - 4))}`;
}

/**
 * A single-use recovery code: 10 unambiguous uppercase alphanumerics as
 * `XXXXX-XXXXX`. Randomness comes from `@dlv/crypto` (CSPRNG) — never
 * `Math.random()` (coding-standards §10.9).
 */
function generateRecoveryCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const source = generateOpaqueToken(16); // base64url over crypto-strong bytes
  let out = '';
  for (let i = 0; out.length < 10; i += 1) {
    out += alphabet.charAt(source.charCodeAt(i % source.length) % alphabet.length);
  }
  return `${out.slice(0, 5)}-${out.slice(5, 10)}`;
}

/**
 * TOTP (RFC 6238) second factor and single-use recovery codes.
 *
 * Secrets are stored field-encrypted via `@dlv/crypto` (PROJECT_MEMORY §7.3);
 * recovery codes are Argon2id-hashed and shown to the user exactly once at
 * enable time.
 */
@Injectable()
export class TotpService {
  constructor(
    @Inject(TOTP_SECRET_REPOSITORY) private readonly secrets: TotpSecretRepository,
    @Inject(RECOVERY_CODE_REPOSITORY) private readonly recovery: RecoveryCodeRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EPHEMERAL_TOKEN_STORE) private readonly tokens: EphemeralTokenStore,
    @Inject(FIELD_CIPHER) private readonly cipher: FieldCipher,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly establisher: SessionEstablisher,
    private readonly audit: AuditService,
  ) {}

  /** Begin enrolment: generate + store a PENDING secret, return provisioning URI. */
  async setup(userId: string, ipMasked: string): Promise<{ otpauthUrl: string; secretMasked: string }> {
    const existing = await this.secrets.findByUser(userId);
    if (existing?.status === 'ENABLED') {
      throw new TotpAlreadyEnabledError();
    }
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const secret = authenticator.generateSecret();
    await this.secrets.upsertPending(userId, this.cipher.encrypt(secret, totpAad(userId)));
    const otpauthUrl = authenticator.keyuri(user.email, TOTP_ISSUER, secret);

    await this.audit.record({
      actorUserId: userId,
      eventType: 'auth.totp.setup_started',
      resource: `user:${userId}`,
      ipMasked,
      payload: {},
    });
    return { otpauthUrl, secretMasked: maskSecret(secret) };
  }

  /** Confirm the code, activate TOTP, and mint one-time recovery codes. */
  async enable(userId: string, code: string, ipMasked: string): Promise<{ recoveryCodes: string[] }> {
    const rec = await this.secrets.findByUser(userId);
    if (!rec) {
      throw new TotpNotConfiguredError();
    }
    if (rec.status === 'ENABLED') {
      throw new TotpAlreadyEnabledError();
    }
    const secret = this.cipher.decrypt(rec.secretEnc, totpAad(userId));
    if (!authenticator.check(code, secret)) {
      throw new InvalidTotpCodeError();
    }

    await this.secrets.enable(userId, this.clock.now());

    const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
    const codes = await Promise.all(
      recoveryCodes.map(async (code) => ({ id: uuidv7(), codeHash: await hashPassword(code) })),
    );
    await this.recovery.replaceAll(userId, codes);

    await this.audit.record({
      actorUserId: userId,
      eventType: 'auth.totp.enabled',
      resource: `user:${userId}`,
      ipMasked,
      payload: {},
    });
    return { recoveryCodes };
  }

  /** Disable TOTP after a fresh password re-check; also drops recovery codes. */
  async disable(userId: string, password: string, ipMasked: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user || !user.passwordHash || !(await verifyPassword(user.passwordHash, password))) {
      throw new InvalidCredentialsError();
    }
    const rec = await this.secrets.findByUser(userId);
    if (!rec || rec.status !== 'ENABLED') {
      throw new TotpNotConfiguredError();
    }
    await this.secrets.deleteByUser(userId);
    await this.recovery.deleteByUser(userId);
    await this.audit.record({
      actorUserId: userId,
      eventType: 'auth.totp.disabled',
      resource: `user:${userId}`,
      ipMasked,
      payload: {},
    });
  }

  /** Complete an MFA login with a TOTP code or a single-use recovery code. */
  async verifyLogin(mfaToken: string, code: string, ctx: RequestContext): Promise<AuthOutcome> {
    const userId = await this.tokens.takeMfa(mfaToken);
    if (!userId) {
      throw new InvalidMfaTokenError();
    }
    const rec = await this.secrets.findByUser(userId);
    if (!rec || rec.status !== 'ENABLED') {
      throw new TotpNotConfiguredError();
    }

    const secret = this.cipher.decrypt(rec.secretEnc, totpAad(userId));
    let ok = authenticator.check(code, secret);
    if (!ok) {
      ok = await this.consumeRecoveryCode(userId, code);
    }
    if (!ok) {
      throw new InvalidMfaCodeError();
    }

    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    await this.audit.record({
      actorUserId: userId,
      eventType: 'auth.mfa.totp.verified',
      resource: `user:${userId}`,
      ipMasked: ctx.ipMasked,
      payload: {},
    });
    return this.establisher.establish(user, ['pwd', 'totp'], ctx);
  }

  private async consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
    const normalised = code.trim().toUpperCase();
    for (const row of await this.recovery.listUnused(userId)) {
      if (await verifyPassword(row.codeHash, normalised)) {
        await this.recovery.markUsed(row.id, this.clock.now());
        return true;
      }
    }
    return false;
  }
}
