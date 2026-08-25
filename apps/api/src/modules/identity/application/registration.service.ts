import { generateOpaqueToken, hashPassword, sha256Hex } from '@dlv/crypto';
import { Role, type UserDto } from '@dlv/shared-types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { ENV } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import { EmailAlreadyRegisteredError } from '../domain/errors/identity.errors';
import { Email } from '../domain/value-objects/email';

import { toUserDto } from './identity.mapper';
import {
  EPHEMERAL_TOKEN_STORE,
  USER_REPOSITORY,
  type EphemeralTokenStore,
  type UserRepository,
} from './ports';

import type { Env } from '@dlv/config';

/** Email-verification token lifetime: 24 hours. */
const VERIFICATION_TTL_SECONDS = 24 * 60 * 60;

/**
 * Registration use case: create a PENDING_VERIFICATION account, hash the
 * password with Argon2id, mint a single-use verification token (only its hash
 * is stored, in Redis) and "send" the verification email — logged in dev, wired
 * to SES in a later phase.
 */
@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EPHEMERAL_TOKEN_STORE) private readonly tokens: EphemeralTokenStore,
    @Inject(ENV) private readonly env: Env,
    private readonly audit: AuditService,
  ) {}

  async register(
    input: { email: string; password: string; firstName: string; lastName: string },
    ctx: { ipMasked: string },
  ): Promise<UserDto> {
    const email = Email.create(input.email);

    // Pre-check for a friendly 409; the DB unique index is the real guard
    // against the race, surfaced by the repository as the same domain error.
    if (await this.users.existsByEmail(email.value)) {
      throw new EmailAlreadyRegisteredError();
    }

    const passwordHash = await hashPassword(input.password);
    const userId = uuidv7();
    const user = await this.users.create({
      id: userId,
      email: email.value,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      passwordHash,
      defaultRole: Role.REGISTERED_USER,
    });

    const verificationToken = generateOpaqueToken();
    await this.tokens.putEmailVerification(
      sha256Hex(verificationToken),
      userId,
      VERIFICATION_TTL_SECONDS,
    );

    const verifyUrl = `${this.env.WEB_BASE_URL}/verify-email?token=${verificationToken}`;
    // Dev: log the link so the flow is testable without a mail server.
    this.logger.log(`Verification email for ${email.masked}: ${verifyUrl}`);

    await this.audit.record({
      actorUserId: userId,
      eventType: 'user.registered',
      resource: `user:${userId}`,
      ipMasked: ctx.ipMasked,
      payload: { emailMasked: email.masked },
    });

    return toUserDto(user);
  }
}
