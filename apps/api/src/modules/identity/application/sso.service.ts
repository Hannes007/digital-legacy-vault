import { generateOpaqueToken, hashPassword } from '@dlv/crypto';
import { Role } from '@dlv/shared-types';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { ENV, FIELD_CIPHER } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';

import { ORGANISATION_MEMBER_REPOSITORY, type OrganisationMemberRepository, OrgMemberRole  } from './org-ports';
import { USER_REPOSITORY, type UserRepository } from './ports';
import { SessionEstablisher } from './session-establisher';
import {
  OIDC_CLIENT,
  SSO_CONNECTION_REPOSITORY,
  SSO_STATE_STORE,
  type OidcClient,
  type SsoConnectionRecord,
  type SsoConnectionRepository,
  type SsoStateStore,
} from './sso-ports';

import type { AuthOutcome } from './auth-outcomes';
import type { RequestContext } from '../../../common/http/request-context';
import type { Env } from '@dlv/config';
import type { FieldCipher } from '@dlv/crypto';
import type { SsoConnectionDto, SsoStartDto, UpsertSsoConnectionRequest } from '@dlv/shared-types';

const STATE_TTL_SECONDS = 600;
const ADMIN_ROLES: ReadonlySet<OrgMemberRole> = new Set(['COMPANY_ADMIN', 'HOSPITAL_ADMIN']);
const MEMBER_ROLES: ReadonlySet<string> = new Set([
  'COMPANY_ADMIN',
  'HOSPITAL_ADMIN',
  'LAWYER',
  'DOCTOR',
  'FINANCIAL_ADVISER',
  'MEMBER',
]);

function toDto(record: SsoConnectionRecord): SsoConnectionDto {
  return {
    organisationId: record.organisationId,
    issuerUrl: record.issuerUrl,
    clientId: record.clientId,
    authorizationEndpoint: record.authorizationEndpoint,
    tokenEndpoint: record.tokenEndpoint,
    userinfoEndpoint: record.userinfoEndpoint,
    emailDomains: record.emailDomains,
    defaultMemberRole: record.defaultMemberRole,
    enabled: record.enabled,
    hasClientSecret: record.clientSecretEnc.length > 0,
  };
}

/**
 * Enterprise SSO (Phase 8): per-organisation OAuth2/OIDC connections (SAML
 * later, PROJECT_MEMORY §3). Authorization-code flow with single-use Redis
 * state; the IdP's userinfo endpoint is authoritative for identity. Users are
 * JIT-provisioned (random unusable password, email pre-verified per the IdP)
 * and added to the organisation with the connection's default role. Sessions
 * are established by the same SessionEstablisher as password/passkey logins.
 */
@Injectable()
export class SsoService {
  constructor(
    @Inject(SSO_CONNECTION_REPOSITORY) private readonly connections: SsoConnectionRepository,
    @Inject(OIDC_CLIENT) private readonly oidc: OidcClient,
    @Inject(SSO_STATE_STORE) private readonly states: SsoStateStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ORGANISATION_MEMBER_REPOSITORY) private readonly members: OrganisationMemberRepository,
    @Inject(FIELD_CIPHER) private readonly cipher: FieldCipher,
    @Inject(ENV) private readonly env: Env,
    private readonly establisher: SessionEstablisher,
    private readonly audit: AuditService,
  ) {}

  private redirectUri(): string {
    return `${this.env.WEB_BASE_URL}/sso/callback`;
  }

  // --- admin configuration ----------------------------------------------------
  private async assertOrgAdmin(organisationId: string, userId: string): Promise<void> {
    const membership = await this.members.findByOrgAndUser(organisationId, userId);
    if (!membership || membership.status !== 'ACTIVE' || !ADMIN_ROLES.has(membership.role)) {
      throw new ForbiddenException('Organisation administrator access required.');
    }
  }

  async getConnection(organisationId: string, userId: string): Promise<SsoConnectionDto> {
    await this.assertOrgAdmin(organisationId, userId);
    const record = await this.connections.findByOrg(organisationId);
    if (!record) throw new NotFoundException('No SSO connection is configured yet.');
    return toDto(record);
  }

  async upsertConnection(
    organisationId: string,
    userId: string,
    input: UpsertSsoConnectionRequest,
  ): Promise<SsoConnectionDto> {
    await this.assertOrgAdmin(organisationId, userId);
    const domains = input.emailDomains.map((d) => d.trim().toLowerCase()).filter((d) => d.length > 0);
    if (domains.length === 0) throw new BadRequestException('At least one email domain is required.');
    const role = input.defaultMemberRole ?? 'MEMBER';
    if (!MEMBER_ROLES.has(role)) throw new BadRequestException('Unknown default member role.');

    const existing = await this.connections.findByOrg(organisationId);
    if (!existing && !input.clientSecret) {
      throw new BadRequestException('A client secret is required when first configuring SSO.');
    }
    const record = await this.connections.upsert({
      id: existing?.id ?? uuidv7(),
      organisationId,
      issuerUrl: input.issuerUrl,
      clientId: input.clientId,
      clientSecretEnc: input.clientSecret ? this.cipher.encrypt(input.clientSecret) : null,
      authorizationEndpoint: input.authorizationEndpoint,
      tokenEndpoint: input.tokenEndpoint,
      userinfoEndpoint: input.userinfoEndpoint,
      emailDomains: domains,
      defaultMemberRole: role as OrgMemberRole,
      enabled: input.enabled ?? true,
    });
    await this.audit.record({
      actorUserId: userId,
      eventType: 'organisation.sso.configured',
      resource: `organisation:${organisationId}`,
      payload: { issuerUrl: input.issuerUrl, domains, enabled: record.enabled },
    });
    return toDto(record);
  }

  // --- login flow ----------------------------------------------------------------
  async start(email: string): Promise<SsoStartDto> {
    const domain = email.toLowerCase().split('@')[1] ?? '';
    if (domain.length === 0) throw new BadRequestException('Enter a valid work email address.');
    const connection = await this.connections.findEnabledByEmailDomain(domain);
    // No-enumeration: reveal nothing about which domains are configured.
    if (!connection) {
      throw new NotFoundException('Single sign-on is not configured for this email domain.');
    }
    const state = generateOpaqueToken();
    await this.states.put(state, connection.organisationId, STATE_TTL_SECONDS);
    const url = new URL(connection.authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', connection.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri());
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    return { authorizationUrl: url.toString() };
  }

  async callback(code: string, state: string, ctx: RequestContext): Promise<AuthOutcome> {
    const organisationId = await this.states.take(state);
    if (!organisationId) throw new UnauthorizedException('Invalid or expired SSO state.');
    const connection = await this.connections.findByOrg(organisationId);
    if (!connection || !connection.enabled) {
      throw new UnauthorizedException('This SSO connection is no longer available.');
    }

    const tokens = await this.oidc.exchangeCode({
      tokenEndpoint: connection.tokenEndpoint,
      clientId: connection.clientId,
      clientSecret: this.cipher.decrypt(connection.clientSecretEnc),
      code,
      redirectUri: this.redirectUri(),
    });
    const profile = await this.oidc.fetchUserInfo(connection.userinfoEndpoint, tokens.accessToken);
    const email = profile.email.toLowerCase();
    const domain = email.split('@')[1] ?? '';
    if (!profile.emailVerified || !connection.emailDomains.includes(domain)) {
      throw new UnauthorizedException('This identity is not eligible for the organisation.');
    }

    let user = await this.users.findByEmail(email);
    if (!user) {
      // JIT provisioning: random unusable password; the IdP verified the email.
      user = await this.users.create({
        id: uuidv7(),
        email,
        firstName: profile.givenName || 'SSO',
        lastName: profile.familyName || 'User',
        passwordHash: await hashPassword(generateOpaqueToken()),
        defaultRole: Role.REGISTERED_USER,
      });
      await this.users.markEmailVerified(user.id);
      user = (await this.users.findById(user.id)) ?? user;
      await this.audit.record({
        actorUserId: user.id,
        eventType: 'auth.sso.user_provisioned',
        resource: `user:${user.id}`,
        payload: { organisationId },
      });
    }

    const membership = await this.members.findByOrgAndUser(organisationId, user.id);
    if (!membership) {
      await this.members.create({
        id: uuidv7(),
        organisationId,
        userId: user.id,
        role: connection.defaultMemberRole,
        status: 'ACTIVE',
      });
    } else if (membership.status === 'INVITED') {
      await this.members.updateStatus(membership.id, 'ACTIVE');
    } else if (membership.status !== 'ACTIVE') {
      throw new ForbiddenException('Your membership of this organisation is suspended.');
    }

    await this.audit.record({
      actorUserId: user.id,
      eventType: 'auth.sso.login',
      resource: `organisation:${organisationId}`,
      ipMasked: ctx.ipMasked,
      payload: { issuer: connection.issuerUrl },
    });
    return this.establisher.establish(user, ['sso'], ctx);
  }
}
