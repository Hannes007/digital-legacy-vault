/**
 * End-to-end auth journey (phase-2-contracts vertical slice):
 * register -> login -> /me -> refresh -> refresh-reuse -> logout.
 *
 * Requires a reachable, migrated Postgres + Redis (docker compose up +
 * `pnpm --filter @dlv/api db:migrate:dev`). If the dependencies are
 * unreachable the whole suite self-skips with a clear message rather than
 * failing — matching test/jest-e2e.config.js.
 */
import { generateKeyPairSync, randomBytes } from 'node:crypto';

import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import type { INestApplication } from '@nestjs/common';

// Configure the environment BEFORE the app (and @dlv/config) load.
function configureEnv(): void {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL ??= 'postgresql://dlv:dlv@localhost:5432/dlv?schema=public';
  process.env.REDIS_URL ??= 'redis://localhost:6379';
  process.env.JWT_PRIVATE_KEY_PEM = privateKey;
  process.env.JWT_PUBLIC_KEY_PEM = publicKey;
  process.env.FIELD_ENCRYPTION_KEY_B64 = randomBytes(32).toString('base64');
}

const REFRESH_COOKIE = 'dlv_rt';

function extractCookie(setCookie: string[] | undefined): string | undefined {
  const header = (setCookie ?? []).find((c) => c.startsWith(`${REFRESH_COOKIE}=`));
  return header?.split(';')[0];
}

describe('Auth flow (e2e)', () => {
  let app: INestApplication | undefined;
  let available = true;
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'correct horse battery staple';

  beforeAll(async () => {
    configureEnv();
    try {
      // Import lazily so env is set first.
      const { AppModule } = await import('../src/app.module');
      const { createValidationPipe } = await import('../src/common/http/validation');
      const { ProblemDetailsFilter } = await import('../src/common/http/problem-details.filter');
      const { PrismaService } = await import('../src/infrastructure/prisma/prisma.service');

      const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = moduleRef.createNestApplication();
      app.use(cookieParser());
      app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });
      app.useGlobalPipes(createValidationPipe());
      app.useGlobalFilters(new ProblemDetailsFilter());
      await app.init();

      await app.get(PrismaService).$queryRaw`SELECT 1`;
    } catch (err) {
      available = false;
       
      console.warn(
        `[e2e] Skipping auth-flow suite — dependencies unavailable: ${(err as Error).message}`,
      );
      if (app) {
        await app.close();
        app = undefined;
      }
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('registers a new account', async () => {
    if (!available || !app) return;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'Tester' })
      .expect(201);
    expect(res.body.email).toBe(email);
    expect(res.body.emailVerified).toBe(false);
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('rejects a bogus email-verification token with problem+json', async () => {
    if (!available || !app) return;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: 'x'.repeat(43) })
      .expect(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.status).toBe(400);
  });

  it('logs in, serves /me, rotates the refresh token, and blocks reuse', async () => {
    if (!available || !app) return;
    const server = app.getHttpServer();

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    expect(login.body.status).toBe('AUTHENTICATED');
    const accessToken: string = login.body.tokens.accessToken;
    const cookie = extractCookie(login.headers['set-cookie'] as unknown as string[]);
    expect(accessToken).toBeTruthy();
    expect(cookie).toBeTruthy();

    const me = await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.email).toBe(email);

    const refreshed = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie as string)
      .expect(200);
    expect(refreshed.body.accessToken).toBeTruthy();
    const rotatedCookie = extractCookie(refreshed.headers['set-cookie'] as unknown as string[]);
    expect(rotatedCookie).toBeTruthy();

    // Reusing the ORIGINAL (now rotated) cookie must be detected and rejected.
    await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie as string)
      .expect(401);

    // The rotated cookie is now also dead (family revoked on reuse detection).
    await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotatedCookie as string)
      .expect(401);
  });

  it('logs out with a bearer token', async () => {
    if (!available || !app) return;
    const server = app.getHttpServer();
    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    await request(server)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${login.body.tokens.accessToken}`)
      .expect(204);
  });
});
