import { Controller, Get, Header, Inject } from '@nestjs/common';

import { ENV } from '../../common/tokens';

import type { Env } from '@dlv/config';

/**
 * RFC 9116 `security.txt` (Phase 9 hardening). Mounted outside `/api/v1` so
 * researchers and scanners find it at the canonical `/.well-known/security.txt`.
 * A machine-readable disclosure contact is a pentest/bug-bounty prerequisite.
 */
@Controller('.well-known')
export class WellKnownController {
  constructor(@Inject(ENV) private readonly env: Env) {}

  @Get('security.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  securityTxt(): string {
    const year = new Date().getUTCFullYear();
    const expires = new Date(Date.UTC(year + 1, 0, 1)).toISOString();
    return [
      `Contact: ${this.env.SECURITY_CONTACT}`,
      `Expires: ${expires}`,
      'Preferred-Languages: en',
      `Canonical: ${this.env.WEB_BASE_URL}/.well-known/security.txt`,
      `Policy: ${this.env.WEB_BASE_URL}/security`,
      '',
    ].join('\n');
  }
}
