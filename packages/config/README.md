# @dlv/config

Zod-validated environment loading for Digital Legacy Vault. Implements the
frozen contract in `docs/02-architecture/phase-2-contracts.md`.

## API

| Export | Purpose |
|---|---|
| `Env` | Fully-typed environment interface (15 variables) |
| `envSchema` | `z.ZodType<Env>` — strips unknown keys, coerces numerics, applies defaults |
| `loadEnv(source?)` | Validate `source` (default `process.env`) → frozen `Env` |
| `renderEnvExample()` | Complete `.env.example` file body, in lockstep with the schema |
| `EnvValidationError` | Thrown by `loadEnv`; `issues: readonly string[]` |

## Behaviour

- **One aggregated error.** `loadEnv` never fails one variable at a time: a
  single `EnvValidationError` lists every missing/invalid variable
  (`VAR_NAME: problem` per line) so the whole environment is fixed in one pass.
- **Secret-safe messages.** Error messages name the variable and the violated
  constraint but never echo the supplied value — safe for logs and crash output.
- **Numeric coercion.** `API_PORT`, `ACCESS_TOKEN_TTL_SECONDS` and
  `REFRESH_TOKEN_TTL_SECONDS` are coerced from their `process.env` string form
  and validated as bounded positive integers.
- **Key validation.** `FIELD_ENCRYPTION_KEY_B64` must be standard base64 that
  decodes to exactly 32 bytes (AES-256).

## Defaults

| Variable | Default |
|---|---|
| `API_PORT` | `4000` |
| `JWT_ISSUER` | `https://dlv.stellr-net.com` |
| `JWT_AUDIENCE` | `dlv-api` |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` (15 min) |
| `REFRESH_TOKEN_TTL_SECONDS` | `2592000` (30 d) |
| `WEBAUTHN_RP_ID` | `localhost` |
| `WEBAUTHN_ORIGIN` | `http://localhost:3000` |
| `COOKIE_DOMAIN` | `localhost` |
| `WEB_BASE_URL` | `http://localhost:3000` |

Required (no default): `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`,
`JWT_PRIVATE_KEY_PEM`, `JWT_PUBLIC_KEY_PEM`, `FIELD_ENCRYPTION_KEY_B64`.

## Usage

```ts
import { loadEnv, renderEnvExample } from '@dlv/config';

const env = loadEnv(); // throws EnvValidationError listing ALL problems

// Regenerate .env.example (e.g. from a repo script):
process.stdout.write(renderEnvExample());
```

## Commands

| Command | Purpose |
|---|---|
| `pnpm build` | tsup → `dist/` (esm + cjs + d.ts) |
| `pnpm test` | vitest with v8 coverage — **100% thresholds enforced** |
| `pnpm typecheck` / `pnpm lint` / `pnpm clean` | as usual |
