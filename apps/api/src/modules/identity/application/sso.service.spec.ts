import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { SsoService } from './sso.service';

import type { OrgMemberRecord, OrganisationMemberRepository } from './org-ports';
import type { UserRepository } from './ports';
import type { SessionEstablisher } from './session-establisher';
import type {
  OidcClient,
  OidcUserInfo,
  SsoConnectionRecord,
  SsoConnectionRepository,
  SsoStateStore,
} from './sso-ports';
import type { RequestContext } from '../../../common/http/request-context';
import type { AuditService } from '../../audit/audit.service';
import type { Env } from '@dlv/config';
import type { FieldCipher } from '@dlv/crypto';

const env = { WEB_BASE_URL: 'https://app.example.com' } as Env;
const cipher: FieldCipher = { encrypt: (v: string) => `enc:${v}`, decrypt: (v: string) => v.replace(/^enc:/, '') };
const ctx: RequestContext = { ip: '1.2.3.4', ipMasked: '1.2.3.x', userAgent: 'jest', deviceLabel: 'test' };

function connection(overrides: Partial<SsoConnectionRecord> = {}): SsoConnectionRecord {
  return {
    id: 'sso1', organisationId: 'org1', issuerUrl: 'https://idp.example.com',
    clientId: 'client-1', clientSecretEnc: 'enc:secret',
    authorizationEndpoint: 'https://idp.example.com/authorize',
    tokenEndpoint: 'https://idp.example.com/token',
    userinfoEndpoint: 'https://idp.example.com/userinfo',
    emailDomains: ['acme.co.za'], defaultMemberRole: 'MEMBER', enabled: true, ...overrides,
  };
}

interface HarnessOpts {
  conn?: SsoConnectionRecord | null;
  stateOrg?: string | null;
  userinfo?: Partial<OidcUserInfo>;
  existingUser?: boolean;
  membership?: Partial<OrgMemberRecord> | null;
}

function harness(opts: HarnessOpts = {}) {
  const createdUsers: string[] = [];
  const createdMemberships: string[] = [];
  const established: string[] = [];
  const states = new Map<string, string>();

  const connections: SsoConnectionRepository = {
    findByOrg: async () => (opts.conn === undefined ? connection() : opts.conn),
    findEnabledByEmailDomain: async (domain) =>
      domain === 'acme.co.za' ? (opts.conn === undefined ? connection() : opts.conn) : null,
    upsert: async (input) => connection({ ...input, clientSecretEnc: input.clientSecretEnc ?? 'enc:secret' }),
  };
  const stateStore: SsoStateStore = {
    put: async (state, orgId) => { states.set(state, orgId); },
    take: async (state) =>
      opts.stateOrg !== undefined ? opts.stateOrg : states.get(state) ?? null,
  };
  const oidc: OidcClient = {
    exchangeCode: async () => ({ accessToken: 'at-1' }),
    fetchUserInfo: async () => ({
      email: 'jane@acme.co.za', emailVerified: true, givenName: 'Jane', familyName: 'Dlamini',
      ...opts.userinfo,
    }),
  };
  const user = {
    id: 'u1', email: 'jane@acme.co.za', emailVerifiedAt: new Date(), firstName: 'Jane',
    lastName: 'Dlamini', status: 'ACTIVE', roles: [], passkeyCount: 0,
  };
  const users = {
    findByEmail: async () => (opts.existingUser === false ? null : user),
    findById: async () => user,
    existsByEmail: async () => opts.existingUser !== false,
    create: async () => { createdUsers.push('u1'); return user; },
    markEmailVerified: async () => undefined,
  } as unknown as UserRepository;
  const members = {
    findByOrgAndUser: async () =>
      opts.membership === undefined
        ? null
        : (opts.membership as OrgMemberRecord | null),
    create: async () => { createdMemberships.push('m'); },
    listByUser: async () => [],
    listByOrg: async () => [],
    updateRole: async () => undefined,
    updateStatus: async () => undefined,
    countAdmins: async () => 1,
  } as unknown as OrganisationMemberRepository;
  const establisher = {
    establish: async (u: { id: string }) => {
      established.push(u.id);
      return { result: { status: 'SUCCESS' } };
    },
  } as unknown as SessionEstablisher;
  const audit = { record: async () => undefined } as unknown as AuditService;

  const svc = new SsoService(connections, oidc, stateStore, users, members, cipher, env, establisher, audit);
  return { svc, createdUsers, createdMemberships, established };
}

describe('SsoService (Phase 8 enterprise SSO)', () => {
  it('start returns the IdP authorization URL with state for a known domain', async () => {
    const h = harness();
    const { authorizationUrl } = await h.svc.start('jane@acme.co.za');
    const url = new URL(authorizationUrl);
    expect(url.origin + url.pathname).toBe('https://idp.example.com/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-1');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/sso/callback');
    expect(url.searchParams.get('state')?.length).toBeGreaterThan(15);
  });

  it('start rejects unknown domains without revealing configuration', async () => {
    await expect(harness().svc.start('jane@other.org')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('callback JIT-provisions a new user, adds membership and establishes a session', async () => {
    const h = harness({ existingUser: false, stateOrg: 'org1', membership: null });
    const outcome = await h.svc.callback('code-1', 'state-1', ctx);
    expect(h.createdUsers).toHaveLength(1);
    expect(h.createdMemberships).toHaveLength(1);
    expect(h.established).toStrictEqual(['u1']);
    expect(outcome.result).toStrictEqual({ status: 'SUCCESS' });
  });

  it('callback rejects bad state, unverified email and foreign domains', async () => {
    await expect(
      harness({ stateOrg: null }).svc.callback('c', 's', ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      harness({ stateOrg: 'org1', userinfo: { emailVerified: false } }).svc.callback('c', 's', ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      harness({ stateOrg: 'org1', userinfo: { email: 'jane@evil.com' } }).svc.callback('c', 's', ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('callback blocks suspended memberships', async () => {
    const membership = { id: 'm1', organisationId: 'org1', userId: 'u1', role: 'MEMBER', status: 'SUSPENDED', createdAt: new Date() };
    await expect(
      harness({ stateOrg: 'org1', membership: membership as never }).svc.callback('c', 's', ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
