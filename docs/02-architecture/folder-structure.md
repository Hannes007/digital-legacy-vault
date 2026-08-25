# Monorepo Folder Structure — Digital Legacy Vault

| Document Control | |
|---|---|
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Architecture Team |
| Source of truth | `PROJECT_MEMORY.md` |

---

## 1. Overview

Single repository `digital-legacy-vault`, **pnpm workspaces + Turborepo**. Three deployables (`apps/web`, `apps/api`, `apps/workers`), shared packages under `packages/`, all infrastructure under `infra/`, documentation under `docs/`. Files kebab-case; classes PascalCase; DB tables snake_case plural (per PROJECT_MEMORY conventions).

## 2. Annotated tree

```
digital-legacy-vault/
├── PROJECT_MEMORY.md                  # canonical decisions — update FIRST when anything changes
├── PROJECT_STATE.md                   # file inventory + next actions
├── package.json                       # root: pnpm workspace + turbo scripts only (no app deps)
├── pnpm-workspace.yaml                # apps/*, packages/*
├── turbo.json                         # pipeline: lint → typecheck → test → build; remote cache
├── tsconfig.base.json                 # strict TS 5.x base, path aliases @dlv/*
├── .npmrc / .nvmrc                    # pinned pnpm + Node LTS
├── docker/
│   ├── api.Dockerfile                 # multi-stage, distroless runtime, non-root
│   ├── web.Dockerfile
│   └── workers.Dockerfile             # includes ClamAV defs + Tesseract binaries
│
├── apps/
│   ├── web/                           # Next.js 15 App Router, React 19, Tailwind 4, PWA
│   │   ├── next.config.ts             # next-pwa, security headers, ISR config
│   │   ├── public/                    # manifest, icons, service-worker assets
│   │   └── src/
│   │       ├── app/                   # App Router
│   │       │   ├── (marketing)/       # public pages: landing, pricing, legal
│   │       │   ├── (auth)/            # login, register, passkeys, totp, oauth callback
│   │       │   │   └── login/page.tsx
│   │       │   ├── (app)/             # authenticated shell (sidebar/nav layout)
│   │       │   │   ├── dashboard/
│   │       │   │   ├── vaults/[vaultId]/
│   │       │   │   │   ├── documents/[documentId]/
│   │       │   │   │   ├── beneficiaries/
│   │       │   │   │   ├── executors/
│   │       │   │   │   ├── sharing/
│   │       │   │   │   ├── timeline/          # GraphQL-fed activity timeline
│   │       │   │   │   └── settings/
│   │       │   │   ├── signatures/[requestId]/ # signing ceremony UI
│   │       │   │   ├── emergency-access/
│   │       │   │   ├── notifications/
│   │       │   │   └── billing/
│   │       │   ├── (admin)/admin/     # back-office (platform roles only)
│   │       │   ├── api/               # route handlers: BFF session bridge, web-push
│   │       │   └── layout.tsx / error.tsx / not-found.tsx
│   │       ├── components/            # app-specific composites (feature-foldered)
│   │       ├── features/              # client feature logic per context (vault/, estate/, ...)
│   │       ├── lib/
│   │       │   ├── api-client/        # generated from OpenAPI (typed fetch)
│   │       │   ├── graphql/           # typed documents for dashboard/timeline
│   │       │   └── client-crypto/     # Client-Encrypted Vault: AES-256-GCM, Shamir shares
│   │       └── styles/
│   │
│   ├── api/                           # NestJS 11 modular monolith
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # single schema, all contexts (tables prefixed by ownership docs)
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── main.ts                # bootstrap: helmet, pino, OTel, swagger
│   │       ├── app.module.ts          # composes all context modules
│   │       ├── common/                # cross-cutting, no business logic
│   │       │   ├── guards/            # auth guard, policy guard, rate-limit guard
│   │       │   ├── interceptors/      # idempotency, audit-context, serialization
│   │       │   ├── filters/           # problem+json (RFC 9457) exception filter
│   │       │   ├── decorators/        # @Policy(), @CurrentUser(), @IdempotencyKey()
│   │       │   ├── pagination/        # cursor encode/decode
│   │       │   └── prisma/            # PrismaService + tenant-scoping client extension
│   │       └── modules/
│   │           ├── identity/
│   │           │   ├── domain/            # entities, value objects, domain events, domain errors
│   │           │   ├── application/       # use-case services, ports (interfaces), DTOs
│   │           │   ├── infrastructure/    # Prisma repositories, Redis session store, adapters
│   │           │   └── presentation/      # REST controllers, GraphQL resolvers, request DTOs
│   │           ├── vault/                 # same 4-layer shape in every context
│   │           ├── sharing/
│   │           ├── estate/
│   │           ├── signature/
│   │           ├── notification/
│   │           ├── billing/
│   │           ├── audit/
│   │           ├── ai/                    # includes AiGateway provider abstraction
│   │           ├── admin/
│   │           └── integration/
│   │
│   └── workers/                       # NestJS standalone app, BullMQ processors only
│       └── src/
│           ├── main.ts                # no HTTP server; health endpoint + queue consumers
│           └── processors/
│               ├── virus-scan/        # ClamAV stream scan, magic bytes, sha256, promote
│               ├── ocr/               # Textract adapter + Tesseract fallback
│               ├── ai/                # classification/summary jobs via @dlv/... AiGateway port
│               ├── notifications/     # SES / Twilio / web-push senders
│               ├── webhooks/          # HMAC signing + retry/backoff dispatcher
│               ├── audit-export/      # hourly JSONL → S3 Object Lock
│               └── reminders/
│
├── packages/
│   ├── shared-types/                  # @dlv/shared-types — enums (DocumentType, roles),
│   │                                  #   API DTO types, webhook event payloads, zod schemas
│   ├── ui/                            # @dlv/ui — design system (Tailwind 4, WCAG 2.2 AA),
│   │                                  #   Storybook, no app imports
│   ├── crypto/                        # @dlv/crypto — envelope helpers, field-level encryption,
│   │                                  #   hash-chain utils, Shamir; isomorphic (browser + node)
│   ├── config/                        # @dlv/config — typed env parsing (zod), constants
│   └── eslint-config/                 # @dlv/eslint-config — shared rules incl. boundaries (see §4)
│
├── infra/
│   ├── terraform/
│   │   ├── modules/                   # reusable, no env specifics
│   │   │   ├── network/               # VPC 3-AZ public/private/isolated, endpoints
│   │   │   ├── eks/                   # cluster, system node group, Karpenter, IRSA roles
│   │   │   ├── rds-postgres/          # Multi-AZ, replicas, proxy, params
│   │   │   ├── elasticache-redis/
│   │   │   ├── s3-buckets/            # quarantine/documents/audit-export/backups + CRR
│   │   │   ├── kms/                   # key hierarchy incl. multi-Region keys
│   │   │   ├── edge/                  # CloudFront, WAF, Shield, Route 53, ACM
│   │   │   ├── observability/         # CloudWatch, alarms, GuardDuty/SecurityHub wiring
│   │   │   └── secrets/
│   │   └── envs/
│   │       ├── dev/                   # backend.tf (state), main.tf composing modules, tfvars
│   │       ├── staging/
│   │       └── prod/                  # includes eu-west-1 pilot-light stack
│   └── helm/
│       ├── charts/
│       │   ├── dlv-web/
│       │   ├── dlv-api/
│       │   └── dlv-workers/           # per-queue Deployments, KEDA-style scaling values
│       └── argocd/                    # app-of-apps, per-env values (values-prod-af1.yaml,
│                                      #   values-prod-euw1.yaml for DR)
│
├── docs/
│   ├── 01-requirements/
│   ├── 02-architecture/               # this document set
│   ├── 03-database/                   # erd.md, data dictionary
│   ├── 04-security/
│   └── adr/                           # ADR-001..N (MADR format)
│
└── .github/
    └── workflows/
        ├── ci.yml                     # turbo lint+typecheck+test+build (affected only)
        ├── api-contract.yml           # OpenAPI regen drift check, Spectral, oasdiff
        ├── docker-publish.yml         # build → scan (Inspector/trivy) → push ECR (dlv-shared)
        ├── terraform-plan.yml         # plan on PR per env, apply via environment approval
        └── security.yml               # CodeQL, dependency review, gitleaks
```

## 3. Clean-architecture layering (apps/api and apps/workers)

Every context module has four layers with a strict inward dependency rule — source code dependencies point only toward `domain`:

| Layer | Contains | May import |
|---|---|---|
| `domain` | Entities, value objects, domain events, domain errors, pure invariant logic | `@dlv/shared-types`, `@dlv/crypto` only — no Nest, no Prisma, no I/O |
| `application` | Use-case services, **ports** (repository/gateway interfaces), application DTOs, policy declarations | own `domain` |
| `infrastructure` | Prisma repositories (implement ports), Redis stores, S3/KMS/SES/Twilio/Stripe/Claude adapters, outbox relay | own `application` + `domain`; the only layer touching Prisma/AWS SDKs |
| `presentation` | REST controllers, GraphQL resolvers, request/response DTO mapping, guards wiring | own `application` (+ `common`) — never `infrastructure` directly |

Rules:
1. **Ports and adapters.** `application` defines interfaces (e.g. `DocumentRepository`, `AiGateway`, `TimestampAuthority`); `infrastructure` implements them; Nest DI binds by token in the module definition. Swapping Textract→Tesseract or Claude→another model is an adapter change only.
2. **Cross-context calls** go through the other context's exported application-service interface or domain events (transactional outbox). Direct import of another context's `domain`/`infrastructure`/`presentation` is forbidden.
3. **Workers** reuse context `application` + `infrastructure` code via the module system; processors are thin shells that dequeue, open a trace span, and invoke a use case.
4. **Prisma schema** is single (one migration history) but table ownership per context is documented in `docs/03-database/erd.md`; cross-context table access in code is a review-blocking violation.

## 4. Import boundaries (ESLint-enforced)

`@dlv/eslint-config` ships `eslint-plugin-boundaries` element definitions; CI fails on violations:

```jsonc
// element types
// app-web | app-api-module:<context> | app-api-layer:<domain|application|infrastructure|presentation>
// app-workers | pkg-shared-types | pkg-ui | pkg-crypto | pkg-config | pkg-eslint-config
{
  "rules": {
    "boundaries/element-types": ["error", { "default": "disallow", "rules": [
      { "from": "layer-domain",         "allow": ["pkg-shared-types", "pkg-crypto"] },
      { "from": "layer-application",    "allow": ["layer-domain", "pkg-shared-types", "pkg-crypto", "pkg-config"] },
      { "from": "layer-infrastructure", "allow": ["layer-application", "layer-domain", "pkg-*"] },
      { "from": "layer-presentation",   "allow": ["layer-application", "layer-domain", "pkg-shared-types"] },
      { "from": "module",               "allow": ["module-public-api"] },   // cross-context: exported app services only
      { "from": "app-web",              "allow": ["pkg-shared-types", "pkg-ui", "pkg-crypto", "pkg-config"] },
      { "from": "app-workers",          "allow": ["layer-application", "layer-infrastructure", "pkg-*"] },
      { "from": "pkg-ui",               "allow": ["pkg-shared-types"] }
    ]}]
  }
}
```

Additional guards:
- `import/no-internal-modules` restricts cross-context imports to each module's `index.ts` public API.
- `no-restricted-imports` bans `@prisma/client` outside `infrastructure` and `common/prisma`, and bans `apps/api` imports from `apps/web` (and vice versa) — cross-app sharing must go through `packages/`.
- `tsconfig` path aliases (`@dlv/shared-types`, `@dlv/ui`, `@dlv/crypto`, `@dlv/config`, `@identity/*`-style per-context aliases) make violations mechanically detectable; `turbo.json` task graph mirrors the same dependency direction so a boundary break also surfaces as a build-graph error.

## 5. Workspace and pipeline conventions

- Root `package.json` holds no runtime deps; every workspace pins its own. Version policy: single lockfile, `syncpack` keeps shared dep versions aligned.
- Turborepo tasks: `lint`, `typecheck`, `test`, `build`, `db:generate`, `db:migrate`; remote caching (Vercel remote cache or self-hosted S3 cache — assumption: S3-backed to keep artifacts in-account); CI runs affected-only via `turbo run ... --filter=...[origin/main]`.
- Conventional Commits + changesets for `packages/*` versioning; trunk-based branching (`main` + short-lived `feat/…`, `fix/…`), release tags `vX.Y.Z` drive Docker image tags and Argo CD promotion.
