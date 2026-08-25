import { Injectable, UnauthorizedException } from '@nestjs/common';

import type { OidcClient, OidcTokenResponse, OidcUserInfo } from '../application/sso-ports';

interface TokenBody {
  access_token?: string;
}
interface UserInfoBody {
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
}

/**
 * Minimal OIDC relying-party HTTP client (Phase 8). The IdP's userinfo
 * endpoint (over TLS, reached with the freshly exchanged access token) is
 * authoritative for identity, so no local JWT verification is needed here.
 */
@Injectable()
export class OidcHttpClient implements OidcClient {
  async exchangeCode(params: {
    tokenEndpoint: string;
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri: string;
  }): Promise<OidcTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    });
    const res = await fetch(params.tokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new UnauthorizedException('SSO code exchange failed.');
    const json = (await res.json()) as TokenBody;
    if (!json.access_token) throw new UnauthorizedException('SSO token response was invalid.');
    return { accessToken: json.access_token };
  }

  async fetchUserInfo(userinfoEndpoint: string, accessToken: string): Promise<OidcUserInfo> {
    const res = await fetch(userinfoEndpoint, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new UnauthorizedException('SSO userinfo request failed.');
    const json = (await res.json()) as UserInfoBody;
    if (!json.email) throw new UnauthorizedException('The identity provider returned no email.');
    return {
      email: json.email,
      emailVerified: json.email_verified ?? false,
      givenName: json.given_name ?? '',
      familyName: json.family_name ?? '',
    };
  }
}
