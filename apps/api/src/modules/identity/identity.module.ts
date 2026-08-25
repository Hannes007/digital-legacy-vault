import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';

import { AccessTokenService } from './application/access-token.service';
import { EmailVerificationService } from './application/email-verification.service';
import { LoginService } from './application/login.service';
import { LogoutService } from './application/logout.service';
import {
  RECOVERY_CODE_REPOSITORY,
  TOTP_SECRET_REPOSITORY,
  WEBAUTHN_CHALLENGE_STORE,
  WEBAUTHN_CREDENTIAL_REPOSITORY,
} from './application/mfa-ports';
import {
  ORGANISATION_MEMBER_REPOSITORY,
  ORGANISATION_REPOSITORY,
} from './application/org-ports';
import { OrganisationService } from './application/organisation.service';
import { PasskeyService } from './application/passkey.service';
import {
  EPHEMERAL_TOKEN_STORE,
  LOGIN_ATTEMPT_GUARD,
  REFRESH_TOKEN_REPOSITORY,
  SESSION_REPOSITORY,
  USER_REPOSITORY,
} from './application/ports';
import { RefreshService } from './application/refresh.service';
import { RegistrationService } from './application/registration.service';
import { SessionEstablisher } from './application/session-establisher';
import { SessionTokenFactory } from './application/session-token.factory';
import { SessionService } from './application/session.service';
import { SsoService } from './application/sso.service';
import {
  OIDC_CLIENT,
  SSO_CONNECTION_REPOSITORY,
  SSO_STATE_STORE,
} from './application/sso-ports';
import { TotpService } from './application/totp.service';
import { PrismaOrganisationMemberRepository } from './infrastructure/prisma-organisation-member.repository';
import { PrismaOrganisationRepository } from './infrastructure/prisma-organisation.repository';
import { PrismaRecoveryCodeRepository } from './infrastructure/prisma-recovery-code.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token.repository';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { PrismaTotpSecretRepository } from './infrastructure/prisma-totp-secret.repository';
import { PrismaSsoConnectionRepository } from './infrastructure/prisma-sso-connection.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { OidcHttpClient } from './infrastructure/oidc-http.client';
import { RedisSsoStateStore } from './infrastructure/redis-sso-state.store';
import { PrismaWebauthnCredentialRepository } from './infrastructure/prisma-webauthn-credential.repository';
import { RedisEphemeralTokenStore } from './infrastructure/redis-ephemeral-token.store';
import { RedisLoginAttemptGuard } from './infrastructure/redis-login-attempt.guard';
import { RedisWebauthnChallengeStore } from './infrastructure/redis-webauthn-challenge.store';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/jwt-auth.guard';
import { MfaController } from './presentation/mfa.controller';
import { OrganisationsController } from './presentation/organisations.controller';
import { SsoController } from './presentation/sso.controller';
import { UsersController } from './presentation/users.controller';

/**
 * Identity bounded context. Phase 2: register, verify email, password login,
 * refresh-token rotation, logout, `/me`, TOTP (+ recovery codes), WebAuthn
 * passkeys, and session management. Ports are bound to their Prisma/Redis
 * adapters here — the single composition root for the context.
 */
@Module({
  imports: [AuditModule, AuthorizationModule],
  controllers: [AuthController, MfaController, UsersController, OrganisationsController, SsoController],
  providers: [
    // Application services
    AccessTokenService,
    SessionTokenFactory,
    SessionEstablisher,
    RegistrationService,
    EmailVerificationService,
    LoginService,
    RefreshService,
    LogoutService,
    TotpService,
    PasskeyService,
    SessionService,
    OrganisationService,
    SsoService,
    JwtAuthGuard,
    // Port bindings
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: EPHEMERAL_TOKEN_STORE, useClass: RedisEphemeralTokenStore },
    { provide: LOGIN_ATTEMPT_GUARD, useClass: RedisLoginAttemptGuard },
    { provide: TOTP_SECRET_REPOSITORY, useClass: PrismaTotpSecretRepository },
    { provide: RECOVERY_CODE_REPOSITORY, useClass: PrismaRecoveryCodeRepository },
    { provide: WEBAUTHN_CREDENTIAL_REPOSITORY, useClass: PrismaWebauthnCredentialRepository },
    { provide: WEBAUTHN_CHALLENGE_STORE, useClass: RedisWebauthnChallengeStore },
    { provide: ORGANISATION_REPOSITORY, useClass: PrismaOrganisationRepository },
    { provide: ORGANISATION_MEMBER_REPOSITORY, useClass: PrismaOrganisationMemberRepository },
    { provide: SSO_CONNECTION_REPOSITORY, useClass: PrismaSsoConnectionRepository },
    { provide: OIDC_CLIENT, useClass: OidcHttpClient },
    { provide: SSO_STATE_STORE, useClass: RedisSsoStateStore },
  ],
  exports: [JwtAuthGuard],
})
export class IdentityModule {}
