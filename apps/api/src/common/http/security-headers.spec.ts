import { corsOrigins, helmetOptions } from './security-headers';

import type { Env } from '@dlv/config';

function env(overrides: Partial<Env> = {}): Env {
  return {
    WEB_BASE_URL: 'https://app.dlv.example',
    CORS_ALLOWED_ORIGINS: '',
    HSTS_ENABLED: false,
    ...overrides,
  } as Env;
}

describe('security-headers (Phase 9 hardening)', () => {
  it('builds a self-first CSP that allows Stripe and denies framing', () => {
    const opts = helmetOptions(env());
    const csp = opts.contentSecurityPolicy;
    expect(csp).toBeTruthy();
    const directives = (csp as { directives: Record<string, string[]> }).directives;
    expect(directives['default-src']).toStrictEqual(["'self'"]);
    expect(directives['script-src']).toContain('https://js.stripe.com');
    expect(directives['frame-ancestors']).toStrictEqual(["'none'"]);
    expect(directives['object-src']).toStrictEqual(["'none'"]);
    expect(directives['connect-src']).toContain('https://app.dlv.example');
  });

  it('omits HSTS in dev and sets a 2-year preload header when enabled', () => {
    expect(helmetOptions(env({ HSTS_ENABLED: false })).strictTransportSecurity).toBe(false);
    const hsts = helmetOptions(env({ HSTS_ENABLED: true })).strictTransportSecurity;
    expect(hsts).toStrictEqual({ maxAge: 63_072_000, includeSubDomains: true, preload: true });
  });

  it('CORS allow-list always includes the web app and dedupes extras', () => {
    expect(corsOrigins(env())).toStrictEqual(['https://app.dlv.example']);
    const many = corsOrigins(
      env({ CORS_ALLOWED_ORIGINS: 'https://staging.dlv.example, https://app.dlv.example ,' }),
    );
    expect(many).toStrictEqual(['https://app.dlv.example', 'https://staging.dlv.example']);
  });
});
