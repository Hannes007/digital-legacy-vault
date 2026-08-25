# @dlv/shared-types

Shared enums, DTOs and API contract types for Digital Legacy Vault, consumed by
`apps/api` (NestJS) and `apps/web` (Next.js). Implements the frozen contract in
`docs/02-architecture/phase-2-contracts.md`.

## What lives here

- `Role` — 15 canonical platform/vault-relationship roles (PROJECT_MEMORY §6)
- `DocumentType` — 21 canonical document categories (PROJECT_MEMORY §5)
- `ProblemDetails` — RFC 9457 error body
- `UserDto`, `AuthTokensDto`, `LoginResultDto`, `SessionDto`
- Request DTOs: `RegisterRequest`, `LoginRequest`, `TotpVerifyRequest`,
  `PasskeyRegistrationStart`/`Finish`, `PasskeyAuthStart`/`Finish`
- WebAuthn Level 3 JSON serialization types (modelled structurally, zero runtime deps)

## Usage

```ts
import { DocumentType, Role } from '@dlv/shared-types';
import type { LoginRequest, LoginResultDto, ProblemDetails } from '@dlv/shared-types';

const login: LoginRequest = { email: 'user@example.com', password: '…' };

function isPlatformRole(role: Role): boolean {
  return [Role.SYSTEM_ADMIN, Role.SUPER_ADMIN, Role.AUDITOR, Role.SUPPORT_AGENT].includes(role);
}
```

## Commands

| Command | Purpose |
|---|---|
| `pnpm build` | tsup → `dist/` (esm + cjs + d.ts) |
| `pnpm dev` | tsup watch mode |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | vitest (enum contract tests) |
| `pnpm lint` | ESLint (`@dlv/eslint-config` base) |
| `pnpm clean` | remove build output |

## Rules

- Runtime surface stays minimal (enums only); everything else is type-only.
- Enum values are frozen — changing them requires a PROJECT_MEMORY update first.
- No `export *` from the package root; the barrel lists every export explicitly.
