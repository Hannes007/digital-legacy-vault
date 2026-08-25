import { afterEach, describe, expect, it, vi } from 'vitest';

import { EnvValidationError, envSchema, loadEnv, renderEnvExample } from './index.js';

import type { Env } from './index.js';

/** Valid standard-base64 encoding of exactly 32 bytes. */
const VALID_KEY_B64 = Buffer.from(new Uint8Array(32).fill(7)).toString('base64');

/** Minimal valid source: only the six variables without defaults. */
function requiredOnly(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://dlv:dlv@localhost:5432/dlv?schema=public',
    REDIS_URL: 'redis://localhost:6379',
    JWT_PRIVATE_KEY_PEM: '-----BEGIN PRIVATE KEY-----\nMIIB...\n-----END PRIVATE KEY-----',
    JWT_PUBLIC_KEY_PEM: '-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----',
    FIELD_ENCRYPTION_KEY_B64: VALID_KEY_B64,
  };
}

function loadFailure(source: NodeJS.ProcessEnv): EnvValidationError {
  try {
    loadEnv(source);
  } catch (error) {
    expect(error).toBeInstanceOf(EnvValidationError);
    return error as EnvValidationError;
  }
  throw new Error('expected loadEnv to throw');
}

describe('loadEnv — defaults', () => {
  it('applies every documented default when only required vars are set', () => {
    const env = loadEnv(requiredOnly());

    expect(env.API_PORT).toBe(4000);
    expect(env.JWT_ISSUER).toBe('https://dlv.stellr-net.com');
    expect(env.JWT_AUDIENCE).toBe('dlv-api');
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(env.REFRESH_TOKEN_TTL_SECONDS).toBe(2_592_000);
    expect(env.WEBAUTHN_RP_ID).toBe('localhost');
    expect(env.WEBAUTHN_ORIGIN).toBe('http://localhost:3000');
    expect(env.COOKIE_DOMAIN).toBe('localhost');
    expect(env.WEB_BASE_URL).toBe('http://localhost:3000');
  });

  it('keeps explicitly provided values over defaults and returns a frozen object', () => {
    const env = loadEnv({
      ...requiredOnly(),
      JWT_AUDIENCE: 'dlv-api-staging',
      COOKIE_DOMAIN: '.stellr-net.com',
    });

    expect(env.NODE_ENV).toBe('test');
    expect(env.JWT_AUDIENCE).toBe('dlv-api-staging');
    expect(env.COOKIE_DOMAIN).toBe('.stellr-net.com');
    expect(Object.isFrozen(env)).toBe(true);
  });
});

describe('loadEnv — numeric coercion', () => {
  it('coerces numeric variables from their process.env string form', () => {
    const env = loadEnv({
      ...requiredOnly(),
      API_PORT: '8080',
      ACCESS_TOKEN_TTL_SECONDS: '600',
      REFRESH_TOKEN_TTL_SECONDS: '86400',
    });

    expect(env.API_PORT).toBe(8080);
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(600);
    expect(env.REFRESH_TOKEN_TTL_SECONDS).toBe(86_400);
  });

  it.each([
    ['not a number', 'abc'],
    ['a float', '80.5'],
    ['zero', '0'],
    ['out of range', '70000'],
    ['empty string', ''],
  ])('rejects API_PORT that is %s', (_label, value) => {
    const error = loadFailure({ ...requiredOnly(), API_PORT: value });
    expect(error.issues).toHaveLength(1);
    expect(error.issues[0]).toMatch(/^API_PORT: must be an integer/);
  });
});

describe('loadEnv — aggregated error reporting', () => {
  it('reports every missing required variable in a single throw', () => {
    const error = loadFailure({});

    for (const name of [
      'NODE_ENV',
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_PRIVATE_KEY_PEM',
      'JWT_PUBLIC_KEY_PEM',
      'FIELD_ENCRYPTION_KEY_B64',
    ]) {
      expect(error.message).toContain(name);
    }
    expect(error.issues).toHaveLength(6);
    expect(error.message).toContain('6 problems');
  });

  it('mixes missing and invalid variables in the same aggregated error', () => {
    const source = requiredOnly();
    delete source['DATABASE_URL'];
    const error = loadFailure({ ...source, NODE_ENV: 'prod', API_PORT: 'abc' });

    expect(error.issues).toHaveLength(3);
    expect(error.message).toContain('3 problems');
    expect(error.message).toContain('NODE_ENV');
    expect(error.message).toContain('API_PORT');
    expect(error.message).toContain('DATABASE_URL');
  });

  it('uses singular wording for a single problem and names the error', () => {
    const error = loadFailure({ ...requiredOnly(), REDIS_URL: 'not a url' });

    expect(error.name).toBe('EnvValidationError');
    expect(error.message).toContain('(1 problem)');
    expect(error.issues).toEqual(['REDIS_URL: must be a valid URL']);
  });

  it('rejects invalid NODE_ENV without echoing the supplied value', () => {
    const error = loadFailure({ ...requiredOnly(), NODE_ENV: 'sandbox' });

    expect(error.issues[0]).toBe(
      "NODE_ENV: must be one of 'development' | 'test' | 'staging' | 'production'",
    );
    expect(error.message).not.toContain('sandbox');
  });
});

describe('loadEnv — FIELD_ENCRYPTION_KEY_B64 (32-byte key)', () => {
  it('accepts standard base64 of exactly 32 bytes', () => {
    expect(loadEnv(requiredOnly()).FIELD_ENCRYPTION_KEY_B64).toBe(VALID_KEY_B64);
  });

  it.each([
    ['16 bytes', Buffer.alloc(16).toString('base64')],
    ['33 bytes', Buffer.alloc(33).toString('base64')],
    ['not base64', '!!definitely not base64!!'],
    ['base64url instead of base64', Buffer.alloc(32, 0xff).toString('base64url')],
    ['empty string', ''],
  ])('rejects a key that is %s', (_label, value) => {
    const error = loadFailure({ ...requiredOnly(), FIELD_ENCRYPTION_KEY_B64: value });
    expect(error.issues).toEqual([
      'FIELD_ENCRYPTION_KEY_B64: must be standard base64 decoding to exactly 32 bytes',
    ]);
  });

  it('never leaks the supplied secret value in message or issues', () => {
    const secret = 'supersecretkeymaterial';
    const error = loadFailure({ ...requiredOnly(), FIELD_ENCRYPTION_KEY_B64: secret });

    expect(error.message).not.toContain(secret);
    expect(error.issues.join('\n')).not.toContain(secret);
  });
});

describe('loadEnv — source defaulting', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads from process.env when no source is given', () => {
    for (const [key, value] of Object.entries(requiredOnly())) {
      vi.stubEnv(key, value as string);
    }
    vi.stubEnv('API_PORT', '4100');

    const env = loadEnv();
    expect(env.API_PORT).toBe(4100);
    expect(env.FIELD_ENCRYPTION_KEY_B64).toBe(VALID_KEY_B64);
  });
});

describe('envSchema', () => {
  it('parses a raw source to the same result as loadEnv', () => {
    const parsed = envSchema.parse(requiredOnly());
    expect(parsed).toEqual({ ...loadEnv(requiredOnly()) });
  });

  it('strips unknown keys instead of failing on them', () => {
    const parsed = envSchema.parse({ ...requiredOnly(), PATH: '/usr/bin', UNRELATED: 'x' });
    expect(parsed).not.toHaveProperty('PATH');
    expect(parsed).not.toHaveProperty('UNRELATED');
  });
});

describe('renderEnvExample', () => {
  it('covers every Env variable exactly once as a KEY=value line', () => {
    const example = renderEnvExample();
    const keys: Array<keyof Env> = [
      'NODE_ENV',
      'API_PORT',
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_PRIVATE_KEY_PEM',
      'JWT_PUBLIC_KEY_PEM',
      'JWT_ISSUER',
      'JWT_AUDIENCE',
      'ACCESS_TOKEN_TTL_SECONDS',
      'REFRESH_TOKEN_TTL_SECONDS',
      'FIELD_ENCRYPTION_KEY_B64',
      'WEBAUTHN_RP_ID',
      'WEBAUTHN_ORIGIN',
      'COOKIE_DOMAIN',
      'WEB_BASE_URL',
    ];

    for (const key of keys) {
      const matches = example.match(new RegExp(`^${key}=`, 'gm'));
      expect(matches, key).toHaveLength(1);
    }
  });

  it('documents the defaults and ends with a trailing newline', () => {
    const example = renderEnvExample();

    expect(example).toContain('API_PORT=4000');
    expect(example).toContain('JWT_ISSUER=https://dlv.stellr-net.com');
    expect(example).toContain('JWT_AUDIENCE=dlv-api');
    expect(example).toContain('ACCESS_TOKEN_TTL_SECONDS=900');
    expect(example).toContain('REFRESH_TOKEN_TTL_SECONDS=2592000');
    expect(example).toContain('openssl rand -base64 32');
    expect(example.endsWith('\n')).toBe(true);
    expect(example).not.toContain(VALID_KEY_B64);
  });

  it('parses cleanly after substituting real secrets (template stays in sync with schema)', () => {
    const lines = renderEnvExample()
      .split('\n')
      .filter((line) => line !== '' && !line.startsWith('#'));
    const source: NodeJS.ProcessEnv = {};
    for (const line of lines) {
      const eq = line.indexOf('=');
      source[line.slice(0, eq)] = line.slice(eq + 1);
    }
    // Substitute the placeholder-only entries with real (dummy) secret values.
    source['FIELD_ENCRYPTION_KEY_B64'] = VALID_KEY_B64;
    source['JWT_PRIVATE_KEY_PEM'] = 'dummy-private-pem';
    source['JWT_PUBLIC_KEY_PEM'] = 'dummy-public-pem';

    const env = loadEnv(source);
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(4000);
  });
});
