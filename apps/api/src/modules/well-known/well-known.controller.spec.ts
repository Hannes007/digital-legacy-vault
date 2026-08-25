import { WellKnownController } from './well-known.controller';

import type { Env } from '@dlv/config';

describe('WellKnownController (RFC 9116, Phase 9)', () => {
  const env = {
    SECURITY_CONTACT: 'mailto:security@dlv.example',
    WEB_BASE_URL: 'https://app.dlv.example',
  } as Env;

  it('emits a well-formed security.txt with a future Expires', () => {
    const txt = new WellKnownController(env).securityTxt();
    expect(txt).toContain('Contact: mailto:security@dlv.example');
    expect(txt).toContain('Canonical: https://app.dlv.example/.well-known/security.txt');

    const expiresLine = txt.split('\n').find((l) => l.startsWith('Expires:'));
    expect(expiresLine).toBeDefined();
    const expires = new Date((expiresLine ?? '').replace('Expires: ', ''));
    expect(expires.getTime()).toBeGreaterThan(Date.now());
  });
});
