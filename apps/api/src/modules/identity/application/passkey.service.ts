import { Inject, Injectable } from '@nestjs/common';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { uuidv7 } from 'uuidv7';


import { CLOCK, ENV } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import {
  InvalidMfaTokenError,
  PasskeyNotFoundError,
  PasskeyVerificationFailedError,
  UserNotFoundError,
  WebauthnChallengeExpiredError,
} from '../domain/errors/identity.errors';

import {
  WEBAUTHN_CHALLENGE_STORE,
  WEBAUTHN_CREDENTIAL_REPOSITORY,
  type WebauthnChallengeStore,
  type WebauthnCredentialRepository,
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
import type { Env } from '@dlv/config';
import type {
  AuthenticationResponseJson,
  PublicKeyCredentialCreationOptionsJson,
  PublicKeyCredentialRequestOptionsJson,
  RegistrationResponseJson,
} from '@dlv/shared-types';

const RP_NAME = 'Digital Legacy Vault';
const CHALLENGE_TTL_SECONDS = 5 * 60;

/** A passkey as listed by `GET /auth/passkeys`. */
export interface PasskeyDto {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** Reads the base64url `challenge` out of a WebAuthn clientDataJSON blob. */
function challengeFromClientData(clientDataJSONB64Url: string): string {
  const parsed = JSON.parse(
    Buffer.from(clientDataJSONB64Url, 'base64url').toString('utf8'),
  ) as { challenge?: unknown };
  if (typeof parsed.challenge !== 'string') {
    throw new PasskeyVerificationFailedError();
  }
  return parsed.challenge;
}

/**
 * WebAuthn passkeys (PROJECT_MEMORY §3): registration and authentication
 * ceremonies plus passkey management. Challenges live in Redis for 5 minutes;
 * signature counters are persisted to detect cloned authenticators.
 *
 * Passkey auth doubles as a first factor (`amr:['passkey']`) or an MFA step-up
 * after password (`amr:['pwd','passkey']` when an `mfaToken` is supplied).
 */
@Injectable()
export class PasskeyService {
  constructor(
    @Inject(WEBAUTHN_CREDENTIAL_REPOSITORY) private readonly creds: WebauthnCredentialRepository,
    @Inject(WEBAUTHN_CHALLENGE_STORE) private readonly challenges: WebauthnChallengeStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EPHEMERAL_TOKEN_STORE) private readonly tokens: EphemeralTokenStore,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly establisher: SessionEstablisher,
    private readonly audit: AuditService,
  ) {}

  async registrationOptions(userId: string): Promise<PublicKeyCredentialCreationOptionsJson> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    const existing = await this.creds.activeCredentialIds(userId);
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: this.env.WEBAUTHN_RP_ID,
      userName: user.email,
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: existing.map((id) => ({ id })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });
    await this.challenges.putRegistration(userId, options.challenge, CHALLENGE_TTL_SECONDS);
    return options;
  }

  async registrationVerify(
    userId: string,
    credential: RegistrationResponseJson,
    deviceLabel: string | undefined,
    ipMasked: string,
  ): Promise<void> {
    const expectedChallenge = await this.challenges.takeRegistration(userId);
    if (!expectedChallenge) {
      throw new WebauthnChallengeExpiredError();
    }
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: this.env.WEBAUTHN_ORIGIN,
      expectedRPID: this.env.WEBAUTHN_RP_ID,
      requireUserVerification: false,
    });
    if (!verification.verified) {
      throw new PasskeyVerificationFailedError();
    }
    const info = verification.registrationInfo;
    await this.creds.create({
      id: uuidv7(),
      userId,
      credentialId: info.credential.id,
      publicKey: info.credential.publicKey,
      signCount: info.credential.counter,
      transports: info.credential.transports ?? null,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      aaguid: info.aaguid,
      deviceLabel: deviceLabel?.trim() ? deviceLabel.trim() : 'Passkey',
    });
    await this.audit.record({
      actorUserId: userId,
      eventType: 'auth.passkey.registered',
      resource: `user:${userId}`,
      ipMasked,
      payload: {},
    });
  }

  async authenticationOptions(email?: string): Promise<PublicKeyCredentialRequestOptionsJson> {
    let allowCredentials: { id: string }[] | undefined;
    if (email) {
      const user = await this.users.findByEmail(email);
      if (user) {
        const ids = await this.creds.activeCredentialIds(user.id);
        allowCredentials = ids.map((id) => ({ id }));
      }
    }
    const options = await generateAuthenticationOptions({
      rpID: this.env.WEBAUTHN_RP_ID,
      userVerification: 'preferred',
      ...(allowCredentials ? { allowCredentials } : {}),
    });
    await this.challenges.putAuthentication(options.challenge, CHALLENGE_TTL_SECONDS);
    return options;
  }

  async authenticationVerify(
    credential: AuthenticationResponseJson,
    mfaToken: string | undefined,
    ctx: RequestContext,
  ): Promise<AuthOutcome> {
    const challenge = challengeFromClientData(credential.response.clientDataJSON);
    if (!(await this.challenges.takeAuthentication(challenge))) {
      throw new WebauthnChallengeExpiredError();
    }

    const stored = await this.creds.findByCredentialId(credential.id);
    if (!stored) {
      throw new PasskeyVerificationFailedError();
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: this.env.WEBAUTHN_ORIGIN,
      expectedRPID: this.env.WEBAUTHN_RP_ID,
      requireUserVerification: false,
      credential: {
        id: credential.id,
        publicKey: new Uint8Array(stored.publicKey),
        counter: stored.signCount,
      },
    });
    if (!verification.verified) {
      throw new PasskeyVerificationFailedError();
    }
    await this.creds.updateOnAuth(stored.id, verification.authenticationInfo.newCounter, this.clock.now());

    let amr = ['passkey'];
    if (mfaToken) {
      const stepUpUserId = await this.tokens.takeMfa(mfaToken);
      if (!stepUpUserId || stepUpUserId !== stored.userId) {
        throw new InvalidMfaTokenError();
      }
      amr = ['pwd', 'passkey'];
    }

    const user = await this.users.findById(stored.userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    await this.audit.record({
      actorUserId: user.id,
      eventType: 'auth.passkey.authenticated',
      resource: `user:${user.id}`,
      ipMasked: ctx.ipMasked,
      payload: { amr },
    });
    return this.establisher.establish(user, amr, ctx);
  }

  async list(userId: string): Promise<PasskeyDto[]> {
    const rows = await this.creds.listActiveByUser(userId);
    return rows.map((r) => ({
      id: r.id,
      deviceLabel: r.deviceLabel,
      createdAt: r.createdAt.toISOString(),
      lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    }));
  }

  async remove(userId: string, id: string, ipMasked: string): Promise<void> {
    const removed = await this.creds.revokeOwned(id, userId, this.clock.now());
    if (!removed) {
      throw new PasskeyNotFoundError();
    }
    await this.audit.record({
      actorUserId: userId,
      eventType: 'auth.passkey.removed',
      resource: `passkey:${id}`,
      ipMasked,
      payload: {},
    });
  }
}
