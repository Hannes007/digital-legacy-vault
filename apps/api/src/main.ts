import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/http/problem-details.filter';
import { corsOrigins, helmetOptions } from './common/http/security-headers';
import { createValidationPipe } from './common/http/validation';
import { ENV } from './common/tokens';

import type { Env } from '@dlv/config';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * API bootstrap.
 *
 * - Global prefix `/api/v1`, with `/health/*` probes and `/.well-known/*`
 *   deliberately excluded so orchestrators and scanners hit stable paths.
 * - Helmet with the documented CSP/HSTS/headers policy (security-architecture
 *   §HTTP-headers) rather than generic defaults; HSTS gated on `HSTS_ENABLED`.
 * - Body-size cap (`MAX_REQUEST_BODY_BYTES`) as a request-path DoS guardrail
 *   (large uploads use pre-signed S3 URLs, not the API body).
 * - Global validation pipe (strips unknown props) + RFC 9457 problem+json filter.
 * - CORS restricted to an explicit origin allow-list with credentials enabled.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    bodyParser: false,
  });
  const env = app.get<Env>(ENV);

  // Correct client IPs behind the load balancer / ingress.
  app.set('trust proxy', 1);

  app.use(helmet(helmetOptions(env)));
  app.use(cookieParser());
  app.useBodyParser('json', { limit: env.MAX_REQUEST_BODY_BYTES });
  app.useBodyParser('urlencoded', { extended: true, limit: env.MAX_REQUEST_BODY_BYTES });

  app.setGlobalPrefix('api/v1', {
    exclude: ['health/live', 'health/ready', '.well-known/security.txt'],
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableCors({ origin: corsOrigins(env), credentials: true });
  app.enableShutdownHooks();

  await app.listen(env.API_PORT);
  new Logger('Bootstrap').log(`DLV API listening on port ${String(env.API_PORT)} (${env.NODE_ENV})`);
}

void bootstrap();
