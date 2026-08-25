import { z } from 'zod';

/**
 * Validated environment configuration (phase-2-contracts §@dlv/config).
 *
 * Secrets (JWT keys, field-encryption key, connection URLs) come from
 * AWS Secrets Manager in cloud environments and from `.env` locally
 * (PROJECT_MEMORY §7.7 — no secrets in code).
 */
export interface Env {
  NODE_ENV: 'development' | 'test' | 'staging' | 'production';
  API_PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_PRIVATE_KEY_PEM: string;
  JWT_PUBLIC_KEY_PEM: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  ACCESS_TOKEN_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_SECONDS: number;
  FIELD_ENCRYPTION_KEY_B64: string;
  WEBAUTHN_RP_ID: string;
  WEBAUTHN_ORIGIN: string;
  COOKIE_DOMAIN: string;
  WEB_BASE_URL: string;
  AWS_REGION: string;
  QUARANTINE_BUCKET: string;
  DOCUMENTS_BUCKET: string;
  KMS_DEK_KEY_ID: string;
  MAX_UPLOAD_BYTES: number;
  UPLOAD_URL_TTL_SECONDS: number;
  CLAMAV_HOST: string;
  CLAMAV_PORT: number;
  OCR_PROVIDER: 'textract' | 'tesseract' | 'none';
  SIGNATURE_TSA_URL: string;
  DOCUMENTS_OBJECT_LOCK_MODE: 'NONE' | 'GOVERNANCE' | 'COMPLIANCE';
  DOCUMENTS_RETENTION_YEARS: number;
  SIGNED_DOCUMENT_RETENTION_YEARS: number;
  /** Stripe secret key (Phase 6). Empty ⇒ dev payment-gateway fallback. */
  STRIPE_SECRET_KEY: string;
  /** Stripe webhook signing secret. Empty ⇒ dev signature acceptance. */
  STRIPE_WEBHOOK_SECRET: string;
  /** Where Stripe checkout redirects on success/cancel and portal return. */
  BILLING_SUCCESS_URL: string;
  BILLING_CANCEL_URL: string;
  BILLING_PORTAL_RETURN_URL: string;
  /** From-address for SES email (Phase 6 notifications). */
  SES_FROM_EMAIL: string;
  /** Twilio credentials for SMS/WhatsApp. Empty ⇒ dev-log fallback. */
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_SMS_FROM: string;
  TWILIO_WHATSAPP_FROM: string;
  /** Web Push VAPID keys. Empty ⇒ dev-log fallback. */
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  /** Anthropic API key (Phase 7 AiGateway). Empty ⇒ deterministic dev fallback. */
  ANTHROPIC_API_KEY: string;
  /** Claude model id used by the AiGateway (PROJECT_MEMORY §2.8). */
  AI_MODEL: string;
  /** Max document characters sent per AI request (input-side cost budget). */
  AI_MAX_INPUT_CHARS: number;
  /** Max output tokens per AI request (output-side cost budget). */
  AI_MAX_OUTPUT_TOKENS: number;
  /** Per-user daily AI request cap (budget circuit breaker). */
  AI_DAILY_REQUEST_CAP: number;
  /** Max delivery attempts before a webhook delivery is marked DEAD (Phase 8). */
  WEBHOOK_MAX_ATTEMPTS: number;
  /** Per-request timeout for outbound webhook deliveries. */
  WEBHOOK_TIMEOUT_MS: number;
  /** Extra browser origins allowed by CORS (comma-separated). WEB_BASE_URL is
   *  always allowed; use this for staging/preview hosts. */
  CORS_ALLOWED_ORIGINS: string;
  /** Enable HSTS (Strict-Transport-Security). Off in dev/local http. */
  HSTS_ENABLED: boolean;
  /** Max accepted JSON/body size (bytes) — DoS guardrail on the request path. */
  MAX_REQUEST_BODY_BYTES: number;
  /** Contact URL/mailto published in /.well-known/security.txt (RFC 9116). */
  SECURITY_CONTACT: string;
}

/** Field-encryption keys are AES-256, i.e. exactly this many bytes. */
const FIELD_KEY_BYTES = 32;
/** Strict standard-base64 alphabet (optional padding). */
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function intFromEnv(min: number, max: number): z.ZodNumber {
  return z.coerce
    .number({ invalid_type_error: 'must be an integer' })
    .int('must be an integer')
    .min(min, `must be an integer >= ${String(min)}`)
    .max(max, `must be an integer <= ${String(max)}`);
}

const requiredString = z.string().min(1, 'must be a non-empty string');

function urlString(): z.ZodString {
  return z.string().url('must be a valid URL');
}

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production'], {
    errorMap: () => ({
      message: "must be one of 'development' | 'test' | 'staging' | 'production'",
    }),
  }),
  API_PORT: intFromEnv(1, 65_535).default(4000),
  DATABASE_URL: urlString(),
  REDIS_URL: urlString(),
  JWT_PRIVATE_KEY_PEM: requiredString,
  JWT_PUBLIC_KEY_PEM: requiredString,
  JWT_ISSUER: urlString().default('https://dlv.stellr-net.com'),
  JWT_AUDIENCE: requiredString.default('dlv-api'),
  ACCESS_TOKEN_TTL_SECONDS: intFromEnv(1, 86_400).default(900),
  REFRESH_TOKEN_TTL_SECONDS: intFromEnv(1, 31_536_000).default(2_592_000),
  FIELD_ENCRYPTION_KEY_B64: z
    .string()
    .refine(
      (value) =>
        BASE64_PATTERN.test(value) && Buffer.from(value, 'base64').byteLength === FIELD_KEY_BYTES,
      { message: `must be standard base64 decoding to exactly ${String(FIELD_KEY_BYTES)} bytes` },
    ),
  WEBAUTHN_RP_ID: requiredString.default('localhost'),
  WEBAUTHN_ORIGIN: urlString().default('http://localhost:3000'),
  COOKIE_DOMAIN: requiredString.default('localhost'),
  WEB_BASE_URL: urlString().default('http://localhost:3000'),
  AWS_REGION: requiredString.default('af-south-1'),
  QUARANTINE_BUCKET: requiredString.default('dlv-dev-quarantine'),
  DOCUMENTS_BUCKET: requiredString.default('dlv-dev-documents'),
  KMS_DEK_KEY_ID: z.string().default(''),
  MAX_UPLOAD_BYTES: intFromEnv(1, 5_368_709_120).default(524_288_000),
  UPLOAD_URL_TTL_SECONDS: intFromEnv(1, 86_400).default(900),
  CLAMAV_HOST: requiredString.default('localhost'),
  CLAMAV_PORT: intFromEnv(1, 65_535).default(3310),
  OCR_PROVIDER: z.enum(['textract', 'tesseract', 'none']).default('none'),
  SIGNATURE_TSA_URL: z.string().default(''),
  DOCUMENTS_OBJECT_LOCK_MODE: z.enum(['NONE', 'GOVERNANCE', 'COMPLIANCE']).default('NONE'),
  DOCUMENTS_RETENTION_YEARS: intFromEnv(0, 100).default(7),
  SIGNED_DOCUMENT_RETENTION_YEARS: intFromEnv(0, 100).default(7),
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  BILLING_SUCCESS_URL: urlString().default('http://localhost:3000/billing?checkout=success'),
  BILLING_CANCEL_URL: urlString().default('http://localhost:3000/billing?checkout=cancel'),
  BILLING_PORTAL_RETURN_URL: urlString().default('http://localhost:3000/billing'),
  SES_FROM_EMAIL: requiredString.default('no-reply@dlv.stellr-net.com'),
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_SMS_FROM: z.string().default(''),
  TWILIO_WHATSAPP_FROM: z.string().default(''),
  VAPID_PUBLIC_KEY: z.string().default(''),
  VAPID_PRIVATE_KEY: z.string().default(''),
  VAPID_SUBJECT: z.string().default('mailto:ops@dlv.stellr-net.com'),
  ANTHROPIC_API_KEY: z.string().default(''),
  AI_MODEL: requiredString.default('claude-haiku-4-5'),
  AI_MAX_INPUT_CHARS: intFromEnv(1_000, 1_000_000).default(48_000),
  AI_MAX_OUTPUT_TOKENS: intFromEnv(1, 32_000).default(1_024),
  AI_DAILY_REQUEST_CAP: intFromEnv(1, 100_000).default(200),
  WEBHOOK_MAX_ATTEMPTS: intFromEnv(1, 20).default(6),
  WEBHOOK_TIMEOUT_MS: intFromEnv(100, 60_000).default(5_000),
  CORS_ALLOWED_ORIGINS: z.string().default(''),
  HSTS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  MAX_REQUEST_BODY_BYTES: intFromEnv(1_024, 52_428_800).default(1_048_576),
  SECURITY_CONTACT: requiredString.default('mailto:security@dlv.stellr-net.com'),
});

export const envSchema: z.ZodType<Env, z.ZodTypeDef, unknown> = rawEnvSchema;

export class EnvValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    const noun = issues.length === 1 ? 'problem' : 'problems';
    super(
      `Invalid environment configuration (${String(issues.length)} ${noun}):\n` +
        issues.map((issue) => `  - ${issue}`).join('\n'),
    );
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = rawEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new EnvValidationError(issues);
  }
  return Object.freeze(result.data);
}

interface EnvExampleEntry {
  key: keyof Env;
  comment: string;
  value: string;
}

const ENV_EXAMPLE_ENTRIES: readonly EnvExampleEntry[] = [
  {
    key: 'NODE_ENV',
    comment: "One of: development | test | staging | production.",
    value: 'development',
  },
  { key: 'API_PORT', comment: 'API listen port.', value: '4000' },
  {
    key: 'DATABASE_URL',
    comment: 'PostgreSQL connection URL (matches docker-compose defaults).',
    value: 'postgresql://dlv:dlv@localhost:5432/dlv?schema=public',
  },
  {
    key: 'REDIS_URL',
    comment: 'Redis connection URL (sessions, cache, queues, rate limiting).',
    value: 'redis://localhost:6379',
  },
  {
    key: 'JWT_PRIVATE_KEY_PEM',
    comment:
      'RS256 private key, PEM. Generate locally: openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048. Cloud: AWS Secrets Manager only.',
    value: '"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"',
  },
  {
    key: 'JWT_PUBLIC_KEY_PEM',
    comment: 'RS256 public key, PEM (served via JWKS).',
    value: '"-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"',
  },
  {
    key: 'JWT_ISSUER',
    comment: 'JWT iss claim.',
    value: 'https://dlv.stellr-net.com',
  },
  { key: 'JWT_AUDIENCE', comment: 'JWT aud claim.', value: 'dlv-api' },
  {
    key: 'ACCESS_TOKEN_TTL_SECONDS',
    comment: 'Access-token TTL in seconds (15 min).',
    value: '900',
  },
  {
    key: 'REFRESH_TOKEN_TTL_SECONDS',
    comment: 'Refresh-token absolute TTL in seconds (30 days).',
    value: '2592000',
  },
  {
    key: 'FIELD_ENCRYPTION_KEY_B64',
    comment:
      '32-byte AES-256 field-encryption key, standard base64. Generate: openssl rand -base64 32. Local/dev only — KMS in cloud.',
    value: '<openssl rand -base64 32>',
  },
  {
    key: 'WEBAUTHN_RP_ID',
    comment: 'WebAuthn relying-party ID (registrable domain of the web app).',
    value: 'localhost',
  },
  {
    key: 'WEBAUTHN_ORIGIN',
    comment: 'WebAuthn expected origin (scheme + host + port of the web app).',
    value: 'http://localhost:3000',
  },
  {
    key: 'COOKIE_DOMAIN',
    comment: 'Domain attribute for auth cookies (dlv_rt).',
    value: 'localhost',
  },
  {
    key: 'WEB_BASE_URL',
    comment: 'Public base URL of the web app (email links, redirects).',
    value: 'http://localhost:3000',
  },
];

export function renderEnvExample(): string {
  const header = [
    '# Digital Legacy Vault — environment template',
    '# Copy to .env and fill in the placeholders. NEVER commit a real .env;',
    '# in cloud environments all secrets come from AWS Secrets Manager',
    '# (PROJECT_MEMORY §7.7).',
  ];
  const body = ENV_EXAMPLE_ENTRIES.map(
    (entry) => `# ${entry.comment}\n${entry.key}=${entry.value}`,
  );
  return `${[header.join('\n'), ...body].join('\n\n')}\n`;
}
