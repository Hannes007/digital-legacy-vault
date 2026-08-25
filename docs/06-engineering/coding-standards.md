# Digital Legacy Vault — Coding Standards

| Document control | |
|---|---|
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Engineering Team |
| Related | `PROJECT_MEMORY.md` §3, §7, §8; `docs/06-engineering/git-strategy.md`; `docs/06-engineering/testing-strategy.md` |

---

## 1. TypeScript strict rules

Single root `tsconfig.base.json` extended by every workspace package. Non-negotiable compiler settings:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "target": "ES2023",
    "skipLibCheck": true
  }
}
```

Rules:

- `any` is banned (`@typescript-eslint/no-explicit-any: error`). Escape hatch is `unknown` + narrowing. A documented `// eslint-disable-next-line -- reason` is required for the rare third-party boundary.
- No non-null assertions (`!`) outside test files.
- `as` casts only at validated boundaries (after Zod/class-validator parse) — never to silence the compiler.
- Prefer `readonly` fields, `Readonly<T>`, and `as const` for literal maps/enums-by-object.
- Domain primitives use branded types: `type UserId = string & { readonly __brand: 'UserId' }` — IDs are UUIDv7 strings (PROJECT_MEMORY §8) and must not cross entity boundaries interchangeably.
- Exhaustiveness: every `switch` over a union ends with an `assertNever(x)` default.
- Public package entry points export explicit types; no `export *` from package roots.

## 2. Naming conventions (PROJECT_MEMORY §8)

| Thing | Convention | Example |
|---|---|---|
| Files & directories | kebab-case | `emergency-access.service.ts` |
| Classes, types, interfaces, enums | PascalCase | `EmergencyAccessGrant` |
| Variables, functions, methods | camelCase | `approveAccessRequest()` |
| DB tables | snake_case plural | `emergency_access_grants` |
| DB columns | snake_case | `approved_at` |
| Enum members | SCREAMING_SNAKE | `POWER_OF_ATTORNEY` |
| Env vars / constants | SCREAMING_SNAKE | `TOKEN_TTL_SECONDS` |
| NestJS file suffixes | `.module` `.controller` `.resolver` `.service` `.entity` `.repository` `.dto` `.guard` `.policy` `.spec` | `vault.controller.ts` |
| React components | PascalCase export in kebab-case file | `document-card.tsx` → `DocumentCard` |
| Booleans | `is/has/can/should` prefix | `isSealed`, `canApprove` |
| GraphQL types | PascalCase; queries/mutations camelCase | `vaultTimeline(vaultId: ID!)` |
| API routes | `/api/v1`, plural kebab-case resources | `/api/v1/emergency-access-requests` |
| Interfaces | no `I` prefix; ports named by role | `DocumentRepository` (interface), `PrismaDocumentRepository` (impl) |

## 3. NestJS clean-architecture layering

Each bounded context (PROJECT_MEMORY §4) is a NestJS module under `apps/api/src/contexts/<context>/` with four layers:

```
contexts/vault/
├── domain/          # entities, value objects, domain events, domain errors, repository ports
├── application/     # use-cases (command/query handlers), application services, DTO ports
├── infrastructure/  # Prisma repositories, S3/KMS/SES adapters, BullMQ producers/consumers
└── presentation/    # REST controllers, GraphQL resolvers, request DTOs, mappers
```

**Dependency rule (enforced by `eslint-plugin-boundaries`):** source code dependencies point inward only.

- `domain` imports nothing from other layers, no NestJS decorators, no Prisma, no AWS SDK. Pure TypeScript.
- `application` imports `domain` only. Depends on ports (interfaces) declared in `domain`/`application`; receives implementations via Nest DI tokens.
- `infrastructure` imports `application` + `domain`; implements ports. **Prisma is allowed only here** — `PrismaClient`/generated types must never appear in domain, application, or presentation imports. Repository implementations map Prisma rows ⇆ domain entities explicitly.
- `presentation` imports `application` (+ domain types for mapping). Controllers/resolvers contain zero business logic: validate → dispatch use-case → map result.
- Cross-context communication: application-layer service interfaces or domain events on the in-process event bus (BullMQ for async); never import another context's `infrastructure` or `domain` internals. Shared kernel lives in `packages/shared-kernel` (IDs, Result, money, time).

## 4. React / Next.js standards

- **Server Components by default.** A file gets `'use client'` only for interactivity (event handlers, hooks, browser APIs) and the justification must be obvious or commented. Client components sit at the leaves; layouts/pages stay server.
- **Data fetching:** server components fetch via the typed API client (`packages/api-client`, generated from OpenAPI 3.1). Client-side reads use TanStack Query wrapping the same client; GraphQL (dashboard/timeline reads per PROJECT_MEMORY §2.7) via a typed codegen client. No raw `fetch` in components.
- **Mutations:** server actions or API calls through the client package; always send idempotency keys on POST (PROJECT_MEMORY §8); optimistic UI only where reversal is trivial (never for signing, deletion, or emergency access).
- **State:** URL is the primary state store (filters, pagination); TanStack Query for server cache; Zustand for the small set of true client state (upload queue, UI shell). No Redux. No state duplication of server data.
- **Styling:** Tailwind 4 semantic utilities from `packages/design-tokens` only (see design-tokens.md §8); no inline hex values; `clsx` + `tailwind-variants` for variants.
- **Files:** one component per file, kebab-case; colocate `document-card.spec.tsx` beside source; shared UI in `packages/ui`.
- **Suspense/streaming:** route-level `loading.tsx` skeletons; error boundaries per route segment with plain-language fallbacks (see design-system.md §9).
- **Forms:** React Hook Form + Zod resolver; the same Zod schema is shared with the API DTO where feasible.

## 5. Error handling

- **Domain/application:** no thrown exceptions for expected failures. Use the shared `Result<T, E>` type (`packages/shared-kernel`):

```ts
type Result<T, E extends DomainError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

  Domain errors are typed classes with stable `code` strings (`VAULT_DOCUMENT_LOCKED`, `EMERGENCY_ACCESS_QUORUM_NOT_MET`). Throwing is reserved for invariant violations (bugs).
- **Edge (presentation):** a global NestJS exception filter maps `Result` errors and unexpected exceptions to RFC 9457 `application/problem+json` (PROJECT_MEMORY §8):

```json
{ "type": "https://docs.dlv.example/errors/vault-document-locked",
  "title": "Document is under legal hold",
  "status": 409, "code": "VAULT_DOCUMENT_LOCKED",
  "instance": "/api/v1/documents/018f...", "traceId": "..." }
```

- Never leak stack traces, SQL, or internal identifiers in responses. 5xx bodies are generic; details go to logs with the `traceId`.
- Frontend: error boundaries convert `problem+json` `code` to user copy via a message catalogue; unknown codes get the generic empathetic fallback.

## 6. Logging standards

- Structured JSON only (pino in Nest, server-side Next). Required fields: `timestamp`, `level`, `traceId`, `spanId`, `context` (bounded context), `event` (snake_case verb phrase), `userId`/`vaultId` where relevant.
- **No PII in logs — ever.** No names, email addresses, ID numbers, document titles, file names, or signature content. Reference entities by UUIDv7 only. A redaction serializer strips known-sensitive keys as a safety net; log-linting in review checks new log statements.
- Levels: `error` (needs action), `warn` (degraded/suspicious), `info` (business events — one per use-case execution), `debug` (dev only, compiled out of prod).
- Audit trail is **not** logging: security-relevant actions emit `AuditEvent`s via the `audit` context (append-only, hash-chained per PROJECT_MEMORY §7.4). Logs are operational and disposable; audit events are evidence.

## 7. Documentation standards

- **TSDoc** on every exported symbol of `packages/*` and every domain entity, use-case, and port. Document *why* and invariants, not restated types.
- **ADRs:** any decision touching PROJECT_MEMORY-level concerns gets an ADR in `docs/adr/` (`NNNN-kebab-title.md`, MADR format: Context / Decision / Consequences). PROJECT_MEMORY is updated in the same PR.
- **OpenAPI:** controllers fully annotated via `@nestjs/swagger`; the generated 3.1 spec is committed and diffed in CI (contract tests — see testing-strategy.md §5).
- READMEs: one per package/app describing purpose, run/test commands, and layer rules. No other ad-hoc docs; knowledge goes to `docs/`.

## 8. Lint & format tooling

- **ESLint 9 flat config** at repo root (`eslint.config.ts`), shared presets in `packages/eslint-config`:
  - `typescript-eslint` strict-type-checked + stylistic-type-checked
  - `eslint-plugin-boundaries` — encodes §3 layer rules and context isolation (element types: `domain`, `application`, `infrastructure`, `presentation`, `shared-kernel`)
  - `eslint-plugin-security`, `eslint-plugin-import-x` (no cycles, enforced package entry points)
  - Next.js: `@next/eslint-plugin-next`, `eslint-plugin-jsx-a11y` (error level), `eslint-plugin-react-hooks`
- **Prettier 3** — single source of formatting; no formatting rules in ESLint. Config: 100 print width, single quotes, trailing commas `all`, semicolons on.
- Enforced in CI (`pnpm turbo lint typecheck`) and via `lefthook` pre-commit (staged-file lint + format). CI is authoritative; hooks are a convenience.

## 9. Code review checklist

Reviewer confirms every item (PR template):

1. Scope matches one Conventional-Commit intent; size within limits (git-strategy.md §4).
2. Layering respected — no Prisma/AWS imports outside `infrastructure`; no cross-context internal imports.
3. AuthZ: every new endpoint/resolver has an explicit CASL policy; deny-by-default preserved (PROJECT_MEMORY §7.8).
4. Input validated at the boundary (DTO + Zod/class-validator); IDs parsed as UUIDv7.
5. Errors: expected failures as `Result`; responses are problem+json; no leaked internals.
6. Logs structured, no PII; security-relevant actions emit `AuditEvent`s.
7. Migrations follow expand/contract (deployment-strategy.md §6); no destructive change with same-release code dependency.
8. Tests: new behaviour covered per testing-strategy.md; coverage gates green.
9. Tokens/design: UI uses semantic tokens only; new colours updated in both design docs.
10. Docs: TSDoc on new public APIs; ADR if a canonical decision changed.
11. No secrets, keys, or endpoints in code/config (PROJECT_MEMORY §7.7).
12. Accessibility: interactive elements keyboard-operable, labelled, focus-visible.

## 10. Security coding rules

1. **Validate at boundaries:** all external input (HTTP, GraphQL, webhooks, queue payloads, S3 event notifications) passes schema validation before touching application code. Whitelist validation (`forbidNonWhitelisted: true`).
2. **No dynamic SQL:** Prisma query API only. `\$queryRaw` requires tagged-template parameters, a code comment justifying it, and security-owner review; string-built SQL is banned by lint rule.
3. **Crypto only via `packages/crypto`:** the shared package wraps KMS envelope encryption, per-document DEKs (AES-256-GCM), field-level encryption, SHA-256 hashing, and RFC 3161 timestamping (PROJECT_MEMORY §7.2–§7.3). Direct use of `node:crypto`, `crypto.subtle`, or KMS SDK outside that package fails lint (`no-restricted-imports`).
4. **Secrets:** AWS Secrets Manager only (PROJECT_MEMORY §7.7); config module resolves at boot; `.env` files exist for local dev with non-production values only and are gitignored; gitleaks runs in CI.
5. **Uploads:** never trust client MIME; the quarantine pipeline (PROJECT_MEMORY §7.5) is the only ingestion path — no code path may write directly to the clean bucket.
6. **AuthZ everywhere:** `@Policy()` decorator required on every route/resolver; a Nest guard rejects handlers without one (fails closed).
7. **SSRF/URL handling:** outbound fetches only to allow-listed hosts via the shared HTTP client; webhook destinations validated and resolved-IP checked.
8. **Client-Encrypted Vault:** code handling client-encrypted objects must never route them to OCR/AI/search (PROJECT_MEMORY §2.4) — enforced by a type-level `EncryptionTier` discriminant so the compiler blocks it.
9. Timing-safe comparison for tokens/hashes; no `Math.random()` for anything security-relevant.
10. Dependencies: pnpm with lockfile committed, `pnpm audit` gate in CI, Renovate weekly, no postinstall scripts without allow-listing.
