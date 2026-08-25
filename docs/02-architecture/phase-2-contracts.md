# Phase 2 Contracts — Shared Package APIs & Cross-App Conventions

> **Version:** 1.0.0 · **Date:** 2026-07-05 · **Status:** Binding for Phase 2
> These contracts are FROZEN for Phase 2. apps/api and apps/web code against these exact
> signatures; packages/* implement them exactly. Changes require updating this file first.

## Workspace package names

| Package | Path | Purpose |
|---|---|---|
| `@dlv/shared-types` | `packages/shared-types` | Enums, DTOs, API contract types shared by api + web |
| `@dlv/crypto` | `packages/crypto` | ALL cryptographic primitives (security invariant: crypto only via this package) |
| `@dlv/config` | `packages/config` | Zod-validated environment loading |
| `@dlv/eslint-config` | `packages/eslint-config` | Shared ESLint flat config (base, nest, next) |

All packages: TypeScript, built with `tsup` (cjs + esm + dts) to `dist/`, `main`/`module`/`types` exports map, scripts: `build`, `dev` (tsup --watch), `typecheck`, `test` (vitest), `lint`, `clean`. Extend `tsconfig.base.json`.

## `@dlv/shared-types` — required exports

```ts
export enum Role {
  GUEST = 'GUEST', REGISTERED_USER = 'REGISTERED_USER', PREMIUM_USER = 'PREMIUM_USER',
  FAMILY_ADMIN = 'FAMILY_ADMIN', EXECUTOR = 'EXECUTOR', BENEFICIARY = 'BENEFICIARY',
  LAWYER = 'LAWYER', DOCTOR = 'DOCTOR', HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  FINANCIAL_ADVISER = 'FINANCIAL_ADVISER', COMPANY_ADMIN = 'COMPANY_ADMIN',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN', SUPER_ADMIN = 'SUPER_ADMIN',
  AUDITOR = 'AUDITOR', SUPPORT_AGENT = 'SUPPORT_AGENT',
}

export enum DocumentType { /* full 21-value enum exactly as PROJECT_MEMORY §5 */ }

export interface UserDto {
  id: string; email: string; firstName: string; lastName: string;
  roles: Role[]; emailVerified: boolean; mfaEnabled: boolean;
  passkeyCount: number; createdAt: string; // ISO 8601 UTC
}

export interface AuthTokensDto { accessToken: string; accessTokenExpiresIn: number; } // refresh token travels ONLY as httpOnly cookie `dlv_rt`

export interface LoginResultDto {
  status: 'AUTHENTICATED' | 'MFA_REQUIRED';
  mfaToken?: string;            // short-lived (5 min) opaque token when MFA_REQUIRED
  methods?: Array<'TOTP' | 'PASSKEY'>;
  user?: UserDto; tokens?: AuthTokensDto; // present when AUTHENTICATED
}

export interface ProblemDetails { // RFC 9457
  type: string; title: string; status: number;
  detail?: string; instance?: string; errors?: Record<string, string[]>;
}

export interface SessionDto {
  id: string; deviceLabel: string; ipMasked: string; lastSeenAt: string;
  createdAt: string; current: boolean;
}
```

Also export request DTO types: `RegisterRequest`, `LoginRequest`, `TotpVerifyRequest`, `PasskeyRegistrationStart/Finish`, `PasskeyAuthStart/Finish` (mirror the endpoint table below).

## `@dlv/crypto` — required exports

```ts
export function sha256Hex(data: string | Uint8Array): string;
export function hmacSha256Hex(key: string | Uint8Array, data: string): string;
export function generateOpaqueToken(bytes?: number): string;        // default 32, base64url
export function hashPassword(password: string): Promise<string>;    // argon2id (m=19456 KiB, t=2, p=1)
export function verifyPassword(hash: string, password: string): Promise<boolean>;

export interface FieldCipher {
  encrypt(plaintext: string, aad?: string): string;  // format: dlv1.<iv_b64url>.<tag_b64url>.<ct_b64url>
  decrypt(ciphertext: string, aad?: string): string; // throws FieldCipherError on tamper/format
}
export function createAesGcmFieldCipher(key: Uint8Array): FieldCipher; // key MUST be 32 bytes
export class FieldCipherError extends Error {}
```

## `@dlv/config` — required exports

```ts
export const envSchema: z.ZodType<Env>;
export interface Env {
  NODE_ENV: 'development' | 'test' | 'staging' | 'production';
  API_PORT: number;                    // default 4000
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_PRIVATE_KEY_PEM: string;         // RS256 (from Secrets Manager in cloud; .env locally)
  JWT_PUBLIC_KEY_PEM: string;
  JWT_ISSUER: string;                  // default 'https://dlv.stellr-net.com'
  JWT_AUDIENCE: string;                // default 'dlv-api'
  ACCESS_TOKEN_TTL_SECONDS: number;    // default 900 (15 min, PROJECT_MEMORY §3)
  REFRESH_TOKEN_TTL_SECONDS: number;   // default 2592000 (30 d absolute)
  FIELD_ENCRYPTION_KEY_B64: string;    // 32-byte key, base64 — local/dev only; KMS in cloud
  WEBAUTHN_RP_ID: string;              // default 'localhost'
  WEBAUTHN_ORIGIN: string;             // default 'http://localhost:3000'
  COOKIE_DOMAIN: string;               // default 'localhost'
  WEB_BASE_URL: string;                // default 'http://localhost:3000'
}
export function loadEnv(source?: NodeJS.ProcessEnv): Env; // throws aggregate error listing all invalid vars
```

## API surface built in Phase 2 (apps/api ⇄ apps/web)

Base: `/api/v1`. Errors: `application/problem+json` (`ProblemDetails`). Auth: `Authorization: Bearer <access>`; refresh via httpOnly `dlv_rt` cookie (Path=/api/v1/auth, Secure, SameSite=Strict).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Register → 201 `UserDto`, sends verification email (logged in dev) |
| POST | `/auth/verify-email` | public | `{ token }` → 204 |
| POST | `/auth/login` | public | `{ email, password }` → `LoginResultDto`; sets `dlv_rt` when AUTHENTICATED |
| POST | `/auth/mfa/totp/verify` | mfaToken | `{ mfaToken, code }` → `LoginResultDto` (AUTHENTICATED) |
| POST | `/auth/refresh` | dlv_rt cookie | Rotate refresh token → `AuthTokensDto`; reuse ⇒ family revoked + 401 |
| POST | `/auth/logout` | bearer | Revoke session + clear cookie → 204 |
| GET | `/auth/me` | bearer | → `UserDto` |
| POST | `/auth/passkeys/registration/options` | bearer | WebAuthn creation options |
| POST | `/auth/passkeys/registration/verify` | bearer | Store credential → 201 |
| POST | `/auth/passkeys/authentication/options` | public | WebAuthn request options (or mfaToken step-up) |
| POST | `/auth/passkeys/authentication/verify` | public | → `LoginResultDto` |
| GET/DELETE | `/auth/passkeys[/:id]` | bearer | List / remove passkeys |
| POST | `/auth/totp/setup` | bearer | → `{ otpauthUrl, secretMasked }` (secret stored field-encrypted, pending) |
| POST | `/auth/totp/enable` | bearer | `{ code }` → 204, issues 10 recovery codes (returned once) |
| DELETE | `/auth/totp` | bearer + fresh password | Disable TOTP → 204 |
| GET | `/users/me/sessions` | bearer | → `SessionDto[]` |
| DELETE | `/users/me/sessions/:id` | bearer | Revoke session → 204 |
| GET | `/health/live`, `/health/ready` | public | Probes |

JWT claims: `sub` (user id), `roles` (Role[]), `sid` (session id), `iss`, `aud`, `iat`, `exp`, `jti`.

## Cross-cutting rules

- IDs UUIDv7 (`uuidv7` npm package). Timestamps timestamptz UTC. Tables snake_case plural.
- Every auth-relevant action writes an `audit_events` row (hash-chained: `prev_hash` + `event_hash = sha256Hex(prev_hash + canonical_json)`).
- Rate limits (from security-architecture): login 5/min/IP + 10/hr/account, register 3/hr/IP, refresh 60/hr/session. Enforced via @nestjs/throttler + Redis storage.
- Lockout: exponential backoff after 5 failed logins (2^n seconds, cap 15 min), never user enumeration (identical error/timing for unknown email vs wrong password).
- Docker images: distroless/alpine multi-stage, non-root user, port 4000 (api) / 3000 (web).
- Local dev: `docker-compose.yml` at repo root provides postgres:16 + redis:7 (api agent owns this file).
