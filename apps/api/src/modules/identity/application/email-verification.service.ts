import { sha256Hex } from '@dlv/crypto';
import { Inject, Injectable } from '@nestjs/common';

import { AuditService } from '../../audit/audit.service';
import { InvalidVerificationTokenError } from '../domain/errors/identity.errors';

import {
  EPHEMERAL_TOKEN_STORE,
  USER_REPOSITORY,
  type EphemeralTokenStore,
  type UserRepository,
} from './ports';

/**
 * Email-verification use case. Consumes the single-use token (atomic
 * get-and-delete in Redis), marks the email verified and promotes the account
 * to ACTIVE. Unknown/expired/used tokens all fail identically.
 */
@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(EPHEMERAL_TOKEN_STORE) private readonly tokens: EphemeralTokenStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly audit: AuditService,
  ) {}

  async verify(token: string, ctx: { ipMasked: string }): Promise<void> {
    const userId = await this.tokens.takeEmailVerification(sha256Hex(token));
    if (!userId) {
      throw new InvalidVerificationTokenError();
    }

    await this.users.markEmailVerified(userId);
    await this.audit.record({
      actorUserId: userId,
      eventType: 'user.email_verified',
      resource: `user:${userId}`,
      ipMasked: ctx.ipMasked,
      payload: {},
    });
  }
}
