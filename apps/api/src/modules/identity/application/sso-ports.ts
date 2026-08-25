import type { OrgMemberRole } from './org-ports';

export const SSO_CONNECTION_REPOSITORY = Symbol('SSO_CONNECTION_REPOSITORY');
export const OIDC_CLIENT = Symbol('OIDC_CLIENT');
export const SSO_STATE_STORE = Symbol('SSO_STATE_STORE');

export interface SsoConnectionRecord {
  id: string;
  organisationId: string;
  issuerUrl: string;
  clientId: string;
  /** Field-encrypted client secret (decrypt via FieldCipher before use). */
  clientSecretEnc: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  emailDomains: string[];
  defaultMemberRole: OrgMemberRole;
  enabled: boolean;
}

export interface UpsertSsoConnectionInput {
  id: string;
  organisationId: string;
  issuerUrl: string;
  clientId: string;
  clientSecretEnc: string | null; // null = keep the stored secret
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  emailDomains: string[];
  defaultMemberRole: OrgMemberRole;
  enabled: boolean;
}

export interface SsoConnectionRepository {
  findByOrg(organisationId: string): Promise<SsoConnectionRecord | null>;
  findEnabledByEmailDomain(domain: string): Promise<SsoConnectionRecord | null>;
  upsert(input: UpsertSsoConnectionInput): Promise<SsoConnectionRecord>;
}

/** Minimal OIDC relying-party client (token exchange + userinfo). */
export interface OidcTokenResponse {
  accessToken: string;
}
export interface OidcUserInfo {
  email: string;
  emailVerified: boolean;
  givenName: string;
  familyName: string;
}
export interface OidcClient {
  exchangeCode(params: {
    tokenEndpoint: string;
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri: string;
  }): Promise<OidcTokenResponse>;
  fetchUserInfo(userinfoEndpoint: string, accessToken: string): Promise<OidcUserInfo>;
}

/** Single-use CSRF state for the authorization-code flow (Redis, short TTL). */
export interface SsoStateStore {
  put(state: string, organisationId: string, ttlSeconds: number): Promise<void>;
  /** Returns and atomically deletes the organisationId, or null. */
  take(state: string): Promise<string | null>;
}
