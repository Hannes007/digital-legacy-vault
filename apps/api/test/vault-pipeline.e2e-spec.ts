/**
 * End-to-end upload pipeline (roadmap Phase 3 exit criterion 4 —
 * pen-test-style abuse suite for the pipeline + audit-chain verification).
 *
 * Journey: init multipart → PUT bytes to the presigned URL → complete →
 * scan/validate/hash/encrypt/promote → READY → versions → timeline (audit chain).
 * Abuse: EICAR (INFECTED), magic-byte spoof (INVALID), oversize (rejected).
 *
 * Requires a migrated Postgres + Redis AND a live storage plane (S3 quarantine +
 * documents buckets, KMS, clamd). Enable with E2E_STORAGE=1 and the vault env
 * vars; otherwise the storage-dependent cases self-skip. DB/Redis absence skips
 * the whole suite (matches auth-flow.e2e-spec.ts).
 */
import { generateKeyPairSync, randomBytes } from 'node:crypto';

import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import type { INestApplication } from '@nestjs/common';

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
  // Vault plane — supply real values in CI when E2E_STORAGE=1.
  process.env.AWS_REGION ??= 'af-south-1';
  process.env.QUARANTINE_BUCKET ??= 'dlv-e2e-quarantine';
  process.env.DOCUMENTS_BUCKET ??= 'dlv-e2e-documents';
  process.env.CLAMAV_HOST ??= 'localhost';
}

const storageEnabled = process.env.E2E_STORAGE === '1';
// A minimal valid 1x1 PNG (magic-byte validation passes).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const EICAR = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*', 'ascii');

describe('Vault pipeline (e2e)', () => {
  let app: INestApplication | undefined;
  let available = true;
  let token = '';
  const email = `vault-e2e-${Date.now().toString()}@example.com`;
  const password = 'correct horse battery staple';

  beforeAll(async () => {
    configureEnv();
    try {
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

      const server = app.getHttpServer();
      await request(server)
        .post('/api/v1/auth/register')
        .send({ email, password, firstName: 'Vault', lastName: 'E2E' })
        .expect(201);
      const login = await request(server).post('/api/v1/auth/login').send({ email, password }).expect(200);
      token = login.body.tokens.accessToken as string;
    } catch (err) {
      available = false;
      console.warn(`[e2e] Skipping vault-pipeline suite — dependencies unavailable: ${(err as Error).message}`);
      if (app) {
        await app.close();
        app = undefined;
      }
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  /** Upload a buffer through the full init → PUT → complete flow; returns the completion body. */
  async function upload(
    fileName: string,
    mimeType: string,
    body: Buffer,
  ): Promise<{ documentId: string; status: string }> {
    const server = app!.getHttpServer();
    const init = await request(server)
      .post('/api/v1/documents/uploads')
      .set('Authorization', `Bearer ${token}`)
      .send({ fileName, mimeType, sizeBytes: body.byteLength, partCount: 1 })
      .expect(201);
    const part = init.body.parts[0] as { url: string };
    const put = await fetch(part.url, { method: 'PUT', body });
    if (!put.ok) throw new Error(`presigned PUT failed: ${String(put.status)}`);
    const etag = put.headers.get('etag') ?? '';
    const complete = await request(server)
      .post('/api/v1/documents/uploads/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ documentId: init.body.documentId, uploadId: init.body.uploadId, parts: [{ partNumber: 1, etag }] })
      .expect(201);
    return complete.body as { documentId: string; status: string };
  }

  it('rejects an oversize upload at init (no storage needed)', async () => {
    if (!available || !app) return;
    await request(app.getHttpServer())
      .post('/api/v1/documents/uploads')
      .set('Authorization', `Bearer ${token}`)
      .send({ fileName: 'big.bin', mimeType: 'application/octet-stream', sizeBytes: 999_999_999_999, partCount: 1 })
      .expect(400);
  });

  it('promotes a clean document and records a verifiable audit timeline', async () => {
    if (!available || !app) return;
    if (!storageEnabled) {
      console.warn('[e2e] Skipping storage case — set E2E_STORAGE=1 with a live S3/KMS/clamd plane.');
      return;
    }
    const server = app.getHttpServer();
    const result = await upload('will.png', 'image/png', PNG);
    expect(result.status).toBe('READY');

    const doc = await request(server)
      .get(`/api/v1/documents/${result.documentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(doc.body.status).toBe('READY');
    expect(doc.body.sha256).toMatch(/^[0-9a-f]{64}$/);

    const versions = await request(server)
      .get(`/api/v1/documents/${result.documentId}/versions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(versions.body[0].version).toBe(1);
    expect(versions.body[0].scanVerdict).toBe('CLEAN');

    const timeline = await request(server)
      .get(`/api/v1/documents/${result.documentId}/timeline`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const events = timeline.body as Array<{ eventType: string; eventHash: string; occurredAt: string }>;
    expect(events.some((e) => e.eventType === 'document.promoted')).toBe(true);
    // Audit chain: every entry is hashed and events are time-ordered.
    for (let i = 0; i < events.length; i++) {
      expect(events[i]!.eventHash).toMatch(/^[0-9a-f]{64}$/);
      if (i > 0) {
        expect(new Date(events[i]!.occurredAt).getTime()).toBeGreaterThanOrEqual(
          new Date(events[i - 1]!.occurredAt).getTime(),
        );
      }
    }
  });

  it('quarantines an EICAR upload (INFECTED, never promoted)', async () => {
    if (!available || !app || !storageEnabled) return;
    const result = await upload('eicar.txt', 'text/plain', EICAR);
    expect(result.status).toBe('INFECTED');
    const versions = await request(app.getHttpServer())
      .get(`/api/v1/documents/${result.documentId}/versions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(versions.body).toHaveLength(0);
  });

  it('rejects a magic-byte/mime spoof (INVALID)', async () => {
    if (!available || !app || !storageEnabled) return;
    const spoof = Buffer.from('this is plain text pretending to be a png', 'utf8');
    const result = await upload('fake.png', 'image/png', spoof);
    expect(result.status).toBe('INVALID');
  });
});
