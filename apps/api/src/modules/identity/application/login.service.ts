import { generateOpaqueToken, hashPassword, sha256Hex, verifyPassword } from '@dlv/crypto';
import { Inject, Injectable } from '@nestjs/common';

import { AuditService } from '../../audit/audit.service';
import { InvalidCredentialsError } from '../domain/errors/identity.errors';
import { Email } from '../domain/value-objects/email';

import {
  EPHEMERAL_TOKEN_STORE,
  LOGIN_ATTEMPT_GUARD,
  USER_REPOSITORY,
  type EphemeralTokenStore,
  type LoginAttemptGuard,
  type UserRepository,
} from './ports';
import { SessionEstablisher } from './session-establisher';

import type { AuthOutcome } from './auth-outcomes';
import type { RequestContext } from '../../../common/http/request-context';

/** MFA continuation token lifetime: 5 minutes (phase-2-contracts). */
const MFA_TOKEN_TTL_SECONDS = 5 * 60;
type MfaMethod = 'TOTP' | 'PASSKEY';

/**
 * Password login use case.
 *
 * No user enumeration (phase-2-contracts): unknown email, wrong password,
 * non-authenticatable status and lockout all yield an identical
 * `InvalidCredentialsError`, and the unknown-email path still performs an
 * Argon2 hash so response timing does not reveal account existence. On success
 * it either returns `MFA_REQUIRED` (TOTP and/or passkey enrolled) or delegates
 * to {@link SessionEstablisher} to issue tokens.
 */
@Injectable()
export class LoginService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(LOGIN_ATTEMPT_GUARD) private readonly attempts: LoginAttemptGuard,
    @Inject(EPHEMERAL_TOKEN_STORE) private readonly tokens: EphemeralTokenStore,
    private readonly establisher: SessionEstablisher,
    private readonly audit: AuditService,
  ) {}

  async login(
    input: { email: string; password: string },
    ctx: RequestContext,
  ): Promise<AuthOutcome> {
    const email = Email.create(input.email);
    const accountKey = sha256Hex(`login:${email.value}`);

    if (await this.attempts.isLocked(accountKey)) {
      await hashPassword(input.password); // equalise timing
      throw new InvalidCredentialsError();
    }

    const user = await this.users.findByEmail(email.value);
    if (!user || !user.passwordHash) {
      await hashPassword(input.password); // equalise timing vs. the found path
      await this.attempts.recordFailure(accountKey);
      await this.recordFailure(email.masked, ctx);
      throw new InvalidCredentialsError();
    }

    const passwordOk = await verifyPassword(user.passwordHash, input.password);
    const authenticatable = user.status === 'ACTIVE' || user.status === 'PENDING_VERIFICATION';
    if (!passwordOk || !authenticatable) {
      await this.attempts.recordFailure(accountKey);
      await this.recordFailure(email.masked, ctx);
      throw new InvalidCredentialsError();
    }

    await this.attempts.reset(accountKey);

    const methods: MfaMethod[] = [
      ...(user.totpEnabled ? (['TOTP'] as const) : []),
      ...(user.passkeyCount > 0 ? (['PASSKEY'] as const) : []),
    ];
    if (methods.length > 0) {
      const mfaToken = generateOpaqueToken(24);
      await this.tokens.putMfa(mfaToken, user.id, MFA_TOKEN_TTL_SECONDS);
      await this.audit.record({
        actorUserId: user.id,
        eventType: 'auth.login.mfa_required',
        resource: `user:${user.id}`,
        ipMasked: ctx.ipMasked,
        payload: { methods },
      });
      return { result: { status: 'MFA_REQUIRED', mfaToken, methods } };
    }

    return this.establisher.establish(user, ['pwd'], ctx);
  }

  private async recordFailure(emailMasked: string, ctx: RequestContext): Promise<void> {
    await this.audit.record({
      actorUserId: null,
      eventType: 'auth.login.failed',
      resource: 'auth:login',
      ipMasked: ctx.ipMasked,
      payload: { emailMasked },
    });
  }
}
