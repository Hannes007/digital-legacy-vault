# PROJECT STATE — Digital Legacy Vault

**Current phase:** 10 — GA Launch ✅ **LAUNCH ARTEFACTS CODE COMPLETE** (exit = signed GA checklist + live launch + 14-day SLO watch → status Live)
**Next phase:** — (roadmap complete; all 10 phases code-complete)
**Source of truth for decisions:** `PROJECT_MEMORY.md` (read it before any future work)

## Phase 2 progress (2026-07-06)

Delivered the `apps/api` NestJS backend for the identity context as an end-to-end
vertical slice, on top of the previously-scaffolded packages, Prisma schema,
Terraform and CI:

- **Bootstrap & infra:** `main.ts`, `app.module.ts`, global `ConfigModule`
  (`@dlv/config`), `PrismaModule`/`PrismaService`, `RedisModule`/`RedisService`,
  `CoreModule` (clock + `@dlv/crypto` field cipher), RFC 9457 `problem+json`
  exception filter, whitelisting `ValidationPipe`, global `ThrottlerGuard`.
- **Audit:** append-only, advisory-locked, hash-chained `AuditService`
  (`event_hash = sha256Hex(prevHash + canonicalJson(event))`).
- **Health:** `/health/live` + `/health/ready` (DB + Redis), mounted outside `/api/v1`.
- **Identity flow (contract-exact):** `POST /auth/register`, `/auth/verify-email`,
  `/auth/login` (no-enumeration + Argon2id timing equalisation + Redis exponential
  backoff), `/auth/refresh` (rotation + family reuse-detection), `/auth/logout`,
  `GET /auth/me`. Clean-architecture layering (domain → application ports →
  Prisma/Redis adapters → presentation). JWT RS256 access tokens + httpOnly
  `dlv_rt` refresh cookie. `JwtAuthGuard` re-checks live session on every request.
- **Local dev:** root `docker-compose.yml` (postgres:16 + redis:7), `apps/api/.env.example`.

**Verification (this environment):** `tsc --noEmit` green; Jest unit suite 14/14
green (canonical-json, mapper, refresh reuse-detection, email-verification);
ESLint clean except `no-unsafe-*` on Prisma client calls — a false positive from
the engine-less `prisma generate` available here (network to binaries.prisma.sh
blocked), which resolves once the client is generated normally. The self-skipping
e2e suite (`test/auth-flow.e2e-spec.ts`) needs a migrated Postgres + Redis.

### MFA increment (2026-07-06)

Completed the identity auth surface:

- **TOTP:** `POST /auth/totp/setup` (field-encrypted secret via `@dlv/crypto`),
  `POST /auth/totp/enable` (issues 10 Argon2id-hashed single-use recovery codes,
  shown once), `DELETE /auth/totp` (fresh-password re-check),
  `POST /auth/mfa/totp/verify` (completes an `MFA_REQUIRED` login with a TOTP or
  recovery code).
- **WebAuthn passkeys** (`@simplewebauthn/server` v13, Redis challenge store):
  registration options/verify, authentication options/verify (email, discoverable
  and MFA step-up flows), `GET`/`DELETE /auth/passkeys`. Sign-counter persisted for
  cloned-authenticator detection.
- **Sessions:** `GET`/`DELETE /users/me/sessions` (revoke also kills the
  refresh-token family).
- **Refactor:** shared `SessionEstablisher` now backs password login, TOTP verify
  and passkey auth; `POST /auth/login` returns `MFA_REQUIRED` with `methods`
  reflecting both TOTP and PASSKEY enrolment.

**Verification:** `tsc --noEmit` green; Jest 22/22 green (added TOTP verify/enable
and session-mapper specs); ESLint clean apart from the same engine-less-Prisma
`no-unsafe-*` false positives (now 119, all confined to Prisma-client-touching
files; zero elsewhere).

### Deployability increment (2026-07-06)

- **Redis throttler storage:** `RedisThrottlerStorage` (atomic Lua increment+block)
  wired via `ThrottlerModule.forRootAsync`, so per-route limits are shared across
  API replicas instead of per-pod.
- **API Dockerfile:** multi-stage (pnpm deps → build + `prisma generate` →
  `pnpm deploy --prod`) onto `gcr.io/distroless/nodejs22-debian12:nonroot`,
  non-root, port 4000; plus `.dockerignore`. Build context is the repo root.
- **Helm chart** `infra/helm/dlv-api`: Deployment (health probes, hardened
  securityContext, config+secret env), Service, HPA, ConfigMap, Ingress (gated),
  ServiceAccount (IRSA-ready), helpers/NOTES. Secrets come from an existing
  K8s Secret synced from AWS Secrets Manager.

**Verification:** `tsc` green, Jest 22/22 green; Chart.yaml/values.yaml parse as
YAML and all templates have balanced delimiters. `docker build` and `helm lint`
were not run here (no docker/helm in this environment) — run them in CI.

### Organisation foundation (2026-07-06)

Final identity-context code for Phase 2 (`/api/v1/organisations`, bearer-auth):

- Create org (creator becomes an admin member by org type), list my orgs, get, update.
- Invitations: invite an existing user (admin-only), accept invite.
- Members: list, change role, remove — with member/admin authorisation and a
  "never remove the last admin" guard.
- All state changes write audit events; Prisma adapters over `organisations` /
  `organisation_members`.

**Verification:** `tsc` green, Jest 28/28 green (added org authorisation spec),
ESLint clean apart from the known engine-less-Prisma `no-unsafe-*` false positives.

### Terraform dev environment (2026-07-06)

- **New module** `modules/elasticache-redis`: encrypted Redis 7 replication group
  (isolated subnets, ingress from EKS SG only, TLS + CMK at rest, AUTH token in
  Secrets Manager) — the missing piece alongside the existing vpc/eks/rds/kms
  modules.
- **New stack** `environments/dev`: composes KMS → VPC → EKS → RDS → Redis into
  one applyable environment with dev cost levers (single NAT, Spot Graviton
  nodes, single-AZ RDS, micro Redis). S3 remote backend (partial config),
  provider default-tags, `terraform.tfvars.example`, and a README with the
  init/apply runbook. Outputs feed the app: RDS + Redis secret names (for
  External Secrets → the Helm `secret.existingSecret`) and the EKS OIDC provider
  ARN (for IRSA).

**Verification:** no `terraform` binary in this environment (release download is
network-blocked), so `terraform validate`/`plan` must run in CI. Structural
checks done here: balanced delimiters/quotes in every file, all module `source`
paths resolve, and every required (no-default) module variable is supplied by
`environments/dev/main.tf`.

### Argo CD GitOps wiring (2026-07-06)

- **dlv-api chart:** added a Prisma migration Job (`templates/migrate-job.yaml`)
  as an Argo CD **PreSync** hook running `prisma migrate deploy`; app pods never
  migrate (deployment-strategy §5). Toggled via `migrations.enabled`.
- **App-of-apps** `infra/helm/env/dev/root-app.yaml` + child
  `apps/dlv-api.yaml` (Argo multi-source: the chart plus the dev value file via
  a `$values` ref), with `automated` sync (`prune` + `selfHeal`).
- **Per-app dev values** `infra/helm/values/dev/{dlv-api,dlv-web}.yaml`; the
  `deploy-dev` workflow now bumps `.image.tag` in those per-app files (was a
  single `dev.yaml` with `.api`/`.web`), matching the per-chart layout.
- README documents the bootstrap (`kubectl apply` the root app), the
  push→ECR→values-bump→Argo-sync flow, and in-cluster prerequisites (External
  Secrets Operator for `dlv-api-secrets`, AWS LB Controller for the `alb` class).

**Verification:** all Argo/values YAML parse; chart templates have balanced
delimiters and the migration Job's `include`s resolve. `helm lint`/`helm template`
and `terraform`/cluster apply remain CI/live steps (no helm/cluster here).

### Phase 2 status

Identity context is **code-complete**: register/verify/login/refresh/logout/me,
TOTP + recovery codes, WebAuthn passkeys, session management, and organisations —
plus audit hash-chain, health probes, Redis-backed throttling, distroless
Dockerfile and Helm chart. Remaining to formally *exit* Phase 2 (per
roadmap.md): `terraform apply` the now-authored `environments/dev` stack against a real AWS
account and wire `main`→dev auto-deploy so the walking skeleton runs on staging. Then Phase 3 —
Vault Core.

### Phase 2 completion (2026-07-07)

Closed every remaining Phase 2 code gap from the roadmap deliverables; the whole
monorepo builds, type-checks, and tests green (verified in a clean install):

- **apps/web** now compiles — added the missing app-shell components
  (`components/app/topbar.tsx`, `mobile-tab-bar.tsx`) and fixed the serwist
  service-worker typing. `tsc --noEmit` clean.
- **apps/workers** (new) — NestJS + BullMQ worker app with processors for the
  upload scan/promote pipeline (§7.5, ClamAV/EICAR + magic-byte + SHA-256),
  audit export, and notifications; health endpoint, Dockerfile, Jest 3/3.
- **packages/design-tokens** (new) — W3C DTCG source, Tailwind 4 `@theme` layer
  (`theme.css`) + dark, typed token exports; vitest 5/5.
- **packages/shared-kernel** (new) — Result/DomainError, UUIDv7, pagination,
  Money, Clock; vitest 8/8.
- **packages/ui** (new) — React component library (Button/Input/Card/Alert/
  Badge/Spinner/Modal + `AppShell`) bound to the design tokens; vitest 5/5.
- **RBAC/CASL** — `@casl/ability` ability factory across all platform roles +
  `PoliciesGuard`/`@CheckPolicies`, wired onto organisation creation. Coarse
  action×resource RBAC; resource-instance ABAC stays in the service layer
  (documented seam). Jest +7 (api now 35/35).
- **Argo CD manifests restored** — `infra/argocd/` app-of-apps (`project.yaml`,
  `root-app.yaml`, `apps/dlv-dev.yaml`) targeting the umbrella chart + dev values.
- **Helm/CI** — workers added to the umbrella chart (deployment, HPA, PDB,
  egress NetworkPolicy, config, IRSA SA) and to the `deploy-dev` image matrix +
  GitOps bump; `dlv/workers` added to bootstrap ECR.
- **pnpm-lock.yaml added** — the repo had none, which would have failed the
  `--frozen-lockfile` installs in CI/Docker. Now committed.

**Verification (clean install, this environment):** all 7 `@dlv/*` packages
build; `tsc --noEmit` green for api, web, workers; tests green — api Jest 35/35,
workers Jest 3/3, crypto/config 100%, design-tokens 5/5, shared-kernel 8/8, ui
5/5. `terraform`/`helm` binaries remain network-blocked here, so their
validate/lint/apply run in CI (structure verified: HCL parses via python-hcl2,
all chart/argo/values YAML parse, template braces balanced).

### Phase 2 exit-criteria runbook (require a live AWS account — not runnable here)

These four roadmap exit criteria depend on real infrastructure and must be run in
the DLV AWS accounts; everything they consume is authored and committed:

1. **`main` auto-deploys to dev.** Apply `infra/terraform/bootstrap` (state + OIDC
   + ECR), then `infra/terraform/envs/dev`; set repo vars `AWS_DEV_ACCOUNT_ID` /
   `AWS_TOOLING_ACCOUNT_ID`; bootstrap Argo CD with `infra/argocd/root-app.yaml`.
   Merges to `main` then build→ECR→values bump→Argo sync automatically.
2. **Register/enrol 2FA/passkey/login on staging.** Author `infra/terraform/envs/
   staging` (reuse the modules with HA values) + `infra/helm/values/staging.yaml`
   + `infra/argocd/apps/dlv-staging.yaml`; run the E2E auth journey against it.
3. **All CI gates active.** Gates are wired (ci.yml, terraform.yml, deploy-dev.yml);
   they run on real PRs/pushes once the OIDC roles + repo vars exist.
4. **DR skeleton (replication) provisioned.** Create the eu-west-1 replica bucket
   (+ CMK) and set `enable_replication=true` with `replica_bucket_arn`/
   `replica_kms_key_arn` on the `s3-documents` module in a staging/prod stack.

## Phase 3 — Vault Core (2026-07-07) ✅ CODE COMPLETE

The document-storage heart of the product, built as a clean-architecture vault
context with ports/adapters so the infra-bound steps are real SDK code but
swappable. Whole monorepo builds and tests green.

- **Upload pipeline (§7.5):** resumable **multipart → quarantine (S3) → ClamAV →
  magic-byte validation → SHA-256 → envelope-encrypt → promote → DocumentVersion**.
  `PromotionService` orchestrates it; every terminal outcome writes an audit event
  and infected/invalid objects are deleted from quarantine, never promoted.
- **Envelope encryption (§7.2):** `@dlv/crypto` gains per-document DEK +
  AES-256-GCM content cipher; DEKs are wrapped by KMS (`KmsAdapter`) with a local
  AES-KEK fallback for dev. Plaintext DEKs are zeroised after use and never stored.
- **Domain + persistence:** Prisma models `Vault`, `Document`, `DocumentVersion`,
  `DocumentCategory`, `Tag`, `DocumentTag`, `ClientVaultItem` + enums; versioning,
  categories, and tags.
- **OCR + search:** `OcrAdapter` (Textract, Tesseract fallback, `none`) feeds
  **Postgres FTS** (`search_vector` + GIN + trigger in `prisma/sql/vault-fts.sql`);
  `SearchService` ranks results with `ts_rank`/`ts_headline`.
- **Timeline v1:** `TimelineService` reads the hash-chained audit log for a
  document; each entry exposes `eventHash` for independent chain verification.
- **Client-Encrypted Vault:** zero-knowledge API (`ClientVaultService`) stores only
  browser ciphertext+IV; `apps/web/src/lib/client-vault.ts` does WebCrypto
  AES-256-GCM + PBKDF2, with a **Shamir 3-of-5 recovery kit** (`@dlv/crypto/shamir`,
  GF(256)).
- **Web:** dropzone, document cards/list, preview (metadata + versions + timeline),
  and a `/vault` page; `vault-api` client.
- **Infra:** ClamAV Deployment/Service in the umbrella chart (`dlv-clamav:3310`);
  app IRSA policy (S3 + KMS + Textract) and the FTS post-migrate step documented in
  `infra/README.md`; api/worker vault config wired in `values/dev.yaml`.

**Verification (clean install):** `tsc --noEmit` green for api/web/workers; tests
green — api Jest **43/43** (incl. pipeline + abuse suite: infected, magic-byte
spoof, oversize, scanner error, non-owner, path traversal), crypto **72/72** incl.
envelope + Shamir at 100% coverage, web client-vault crypto **2/2**, all other
package suites green. The abuse suite also proves envelope round-trip integrity
(unwrap DEK → decrypt == original).

### Phase 3 exit-criteria runbook (need a live environment — not runnable here)
1. **E2E journey 2 green** — the Playwright spec is wired:
   `apps/web/e2e/journey-2-vault.spec.ts` (+ `playwright.config.ts`), run by the
   gated `.github/workflows/e2e.yml` (`workflow_dispatch`). It drives
   login→upload→scan→promote→READY→preview+timeline, self-skips without a stack,
   and logs the READY elapsed time (also covers the SLA below). Point it at a
   deployed env via `E2E_BASE_URL`/`E2E_API_URL` + a seeded verified account
   (`E2E_EMAIL`/`E2E_PASSWORD`); Vitest is scoped to `src/` so it ignores e2e.
2. **Upload SLA p95 < 60 s (≤25 MB)** — load-test the pipeline; the scan/OCR steps
   run in the worker so the request path stays fast.
3. **Audit chain verifiable** — `TimelineService` exposes `eventHash`; add the chain
   re-computation check to the audit verification job.
4. **Abuse suite passing in CI** — unit abuse suite green here; the API pipeline
   e2e (`apps/api/test/vault-pipeline.e2e-spec.ts`, init→PUT→complete→scan→promote,
   EICAR/magic-byte/oversize, audit-chain check) runs in the `api-pipeline` job of
   `.github/workflows/e2e.yml` with Postgres/Redis service containers. Set
   `E2E_STORAGE=1` + real S3/KMS/clamd vars on the environment to exercise the full
   storage path; those cases self-skip otherwise.

## Phase 4 — Sharing & Estate (2026-07-07) ✅ CODE COMPLETE

The "legacy" layer — people and posthumous access — as two clean-architecture
contexts plus the vault-relationship ABAC engine. Whole monorepo builds/tests green.

- **Sharing context:** `DocumentShare` (email shares, expiry, revoke), `SecureLink`
  (opaque token → SHA-256-hashed; one-time URL; default 7 d / max 90 d; max-views;
  public resolve endpoint; QR rendered client-side), `AccessRequest` (request →
  owner approve/deny). Every mutation audited.
- **Estate context:** `Beneficiary` / `Executor` management; **emergency access
  engine** (§7.6/§9): min-2 quorum, no self-approval, platform-staff excluded,
  time delay (default 72 h / 24 h–30 d; death claim 7 d, 48 h floor; medical-only
  1 h expedite **requiring dual medical approval**), owner notification (non-
  disableable), read-only time-boxed (30 d) scoped grant; **death-verification
  workflow v1** (submit evidence → manual review by SUPPORT_AGENT/verifiers).
- **Vault-relationship ABAC:** `RelationshipAccessService` resolves read access via
  ownership or an ACTIVE, in-window emergency grant honouring scope
  (FULL/CATEGORY/MEDICAL_ONLY) — deny by default.
- **Web (bereavement-tone, design-system §9):** share dialog (email + secure link
  + QR), a warm **/legacy** hub (beneficiaries, executors, incoming emergency
  requests with deny), wired into the vault preview and sidebar.

**Verification (clean install):** `tsc` green api/web/workers; **api Jest 72/72**
(+29: emergency-policy 13, authz matrix 7, secure-link 6, emergency-access 3);
web/packages suites green. Prisma models added for all Phase-4 entities.

### Phase 4 exit-criteria runbook
- **E2E journeys 3–5** (share/access-request; emergency access; death-verification)
  — extend the gated Playwright + API e2e harness (Phase 3 pattern) against a
  deployed stack; specs to add under `apps/web/e2e` + `apps/api/test`.
- **Authz matrix suite covering new role/resource pairs — DONE** as unit tests
  (`relationship-access.service.spec.ts`); broaden as new resources land.
- **Legal review** of emergency-access + death-verification flows — external
  sign-off (ECTA/POPIA + SA Wills Act caveats); track in the risk register.

---

## File inventory (Phase 1)

| File | Purpose | Status |
|---|---|---|
| `PROJECT_MEMORY.md` | Canonical decisions, stack, domain model, conventions, policy defaults | ✅ |
| `PROJECT_STATE.md` | This file — phase status and inventory | ✅ |
| `README.md` | Repo overview and doc index | ✅ |
| `docs/01-requirements/srs.md` | Software Requirements Specification (FR/NFR, MoSCoW, acceptance criteria) | ✅ |
| `docs/01-requirements/prd.md` | Product Requirements Document (personas, pricing, MVP, KPIs) | ✅ |
| `docs/01-requirements/user-stories.md` | 85 user stories with Given/When/Then acceptance criteria | ✅ |
| `docs/01-requirements/use-cases.md` | UC-001–UC-015 formal use cases | ✅ |
| `docs/02-architecture/system-architecture.md` | C4 views, modular monolith + BullMQ workers, ADRs, multi-tenancy | ✅ |
| `docs/02-architecture/api-architecture.md` | REST /api/v1 + GraphQL, auth flows, webhooks, integration patterns | ✅ |
| `docs/02-architecture/aws-architecture.md` | VPC/EKS/RDS/S3/KMS design, af-south-1 + eu-west-1 DR, multi-account | ✅ |
| `docs/02-architecture/folder-structure.md` | Monorepo layout (pnpm + Turborepo), clean-architecture layering | ✅ |
| `docs/03-database/erd.md` | Full Mermaid ERD + data dictionary, encryption flags, partitioning | ✅ |
| `docs/04-security/security-architecture.md` | Zero trust, envelope encryption, upload pipeline, OWASP, IR | ✅ |
| `docs/04-security/threat-model.md` | STRIDE, trust boundaries, domain abuse cases, mitigation backlog | ✅ |
| `docs/04-security/risk-register.md` | Risk register with 5×5 scoring and owners | ✅ |
| `docs/05-design/design-system.md` | Apple-inspired UI system, WCAG 2.2 AA, light/dark | ✅ |
| `docs/05-design/design-tokens.md` | W3C token JSON + Tailwind 4 @theme mapping | ✅ |
| `docs/06-engineering/coding-standards.md` | TS strict, layering rules, review checklist, security coding | ✅ |
| `docs/06-engineering/git-strategy.md` | Trunk-based, Conventional Commits, PR/release rules | ✅ |
| `docs/06-engineering/cicd-pipeline.md` | GitHub Actions PR/deploy pipelines, Argo CD, OIDC to AWS | ✅ |
| `docs/06-engineering/testing-strategy.md` | Test pyramid, coverage gates, security/a11y/perf testing | ✅ |
| `docs/06-engineering/deployment-strategy.md` | GitOps, canary, expand/contract migrations, DR runbook | ✅ |
| `docs/07-planning/roadmap.md` | Phases 2–10, MVP ≈ 2026-12-04, GA ≈ 2027-05-14, Gantt | ✅ |

## Reconciliations performed (Phase 1 close-out)

1. Upload cap unified to **500 MB** everywhere (security doc previously said 250 MB).
2. Emergency-access policy unified: 72 h default delay (24 h–30 d), 7 d death claims (48 h floor), 1 h medical-scope expedite, 30-day grants. Recorded in PROJECT_MEMORY §9.
3. All entity, role, and enum names verified against PROJECT_MEMORY §5–6.

## Open items carried into Phase 2

- Confirm ZAR pricing (PRD proposes Free R0 / Premium R99 / Family R199 / Professional R499 seat / Enterprise from R4,999 pm).
- Confirm domain `dlv.stellr-net.com`.
- Legal review of ECTA signature positioning and SA Wills Act caveat wording (Risk register R-00x, legal category).
- Home Affairs death-record verification: post-launch integration; manual dual review at launch.

## Phase 2 scope (proposed, on approval)

Monorepo scaffold (pnpm + Turborepo per folder-structure.md), `identity` bounded context (registration, login, JWT+refresh, passkeys, TOTP, RBAC/ABAC skeleton), Prisma schema for identity tables, PR pipeline from cicd-pipeline.md, Terraform bootstrap (state, accounts, VPC dev), Helm chart skeleton. Exit criteria in `docs/07-planning/roadmap.md`.

## Phase 5 — Signatures & Compliance (2026-07-16) ✅ CODE COMPLETE

Delivered the **signature bounded context** end-to-end (backend + web) — the
ECTA-aligned signing ceremony and its cryptographic seal (PROJECT_MEMORY §2.9).
The broader Phase 5 compliance deliverables (below) remain outstanding.

- **@dlv/crypto — seal + timestamp primitives:** `sealDigestHex`/`canonicalStringify`
  (deterministic, sorted-key evidence digest) and RFC 3161 timestamp helpers:
  `buildTimeStampReq` (standards DER `TimeStampReq`, SHA-256 message imprint),
  `issueDevTimestampToken`/`verifyDevTimestampToken` (self-issued, HMAC-authenticated,
  offline-verifiable dev token). vitest 88/88, 100% coverage.
- **Signature context (`apps/api/modules/signature`, clean architecture):**
  - *Domain* — versioned `SealEvidence` bundle (binds signer identity, document
    version SHA-256, captured-signature hash, consent text + acceptance time,
    masked IP/UA) + `computeSealDigest`; expiry policy (default 14 d, max 90 d).
  - *Application* — `SignatureRequestService` (create over a READY vault document,
    list/get/cancel, self-sign default), `SignatureCeremonyService` (capture →
    build evidence → seal digest → trusted-timestamp → persist `Signature`,
    single-seal + expiry + assigned-signer guards, audits `signature.sealed`),
    `SealVerificationService` (independent re-verify: evidence digest match +
    timestamp valid + document integrity intact; party/auditor authz).
  - *Infrastructure* — Prisma repos + `TsaAdapter` (`TimestampAuthority` port):
    real RFC 3161 HTTP path when `SIGNATURE_TSA_URL` set, else offline dev token
    (mirrors the KMS/dev-KEK envelope fallback).
  - *Presentation* — `POST/GET /signature-requests`, `POST /signature-requests/:id/sign`,
    `DELETE /signature-requests/:id`, `GET /signatures/:id/verification`.
- **Prisma:** `SignatureRequest`, `Signature` models + `SignatureRequestStatus`,
  `SignatureMethod` enums. `@dlv/shared-types`: signature enums + DTOs.
- **Config:** `SIGNATURE_TSA_URL` (empty ⇒ dev fallback).
- **Web (`apps/web`):** `/signatures` page (create request from a READY doc, list
  with status, verify seal inline), `SignaturePad` (draw/type/upload capture),
  `CeremonyDialog` (capture + ECTA consent checkbox + seal), `signature-api`
  client, sidebar nav. Wills wet-ink caveat surfaced in copy.

**Verification (clean install, this environment):** `tsc --noEmit` green for
**api (0 errors)** and **web (0 errors)**; **api Jest 79/79** (+7 signature: seal
determinism, end-to-end seal→verify, tamper detection, non-signer rejection,
expiry); crypto **88/88** (100% cov), shared-types 5/5, config 25/25, web vitest
2/2. ESLint: signature production code clean; only the known engine-less-Prisma
`no-unsafe-*` false positives (the two signature Prisma repos) and the spec
`require-await` pattern shared with prior phases remain. `prisma migrate`/live
DB and a real TSA endpoint are CI/live steps.

### Phase 5 — compliance deliverables (2026-07-16) — CODE COMPLETE

The remaining Phase 5 compliance scope is now built end-to-end (backend + web);
the whole monorepo type-checks and tests green.

- First-class Consent context (apps/api/modules/consent): Consent model +
  ConsentPurpose/ConsentStatus enums; ConsentService (record/withdraw/list) which
  also implements a cross-context ConsentRecorder port. The signing ceremony now
  emits an ELECTRONIC_SIGNATURE consent bound to the sealed signature via
  sourceContext (signature:<id>), replacing inline-only capture. Endpoints
  /consents GET/POST/:id/withdraw.
- LegalHold entity + enforcement (apps/api/modules/legal-hold): LegalHold model +
  LegalHoldScope/LegalHoldStatus; LegalHoldService place/release/list (platform
  compliance roles only; auditors read-only) and resolveActiveHolds
  (USER/DOCUMENT/VAULT scope) — the enforcement seam the erasure path consults.
  Endpoints /legal-holds GET/POST/:id/release.
- S3 Object Lock (compliance mode): StoragePort.putDocument accepts an Object Lock
  RetentionSpec; new applyRetention (PutObjectRetention). Promotion applies
  retention when DOCUMENTS_OBJECT_LOCK_MODE != NONE; DocumentRetentionService
  applies COMPLIANCE-mode WORM retention to the signed version after each seal
  (no-op in dev). Config: DOCUMENTS_OBJECT_LOCK_MODE, DOCUMENTS_RETENTION_YEARS,
  SIGNED_DOCUMENT_RETENTION_YEARS.
- POPIA/GDPR DSR tooling v1 (apps/api/modules/data-subject): DataSubjectRequest
  model; /data-subject/export (portable JSON), /data-subject/erasure (refused
  while any legal hold applies; otherwise crypto-erasure — destroys wrapped DEKs
  so Object-Lock-retained ciphertext is unrecoverable, deletes client-vault items,
  revokes sessions, anonymises the profile), and /data-subject/requests history.
  Honours legal holds AND S3 Object Lock by design.
- Wills wet-ink guidance UX (apps/web): dedicated /wills page — Wills Act 7 of 1953
  execution checklist, the "cannot sign electronically" caveat, and a preserve
  flow into upload + signature-evidence. Plus a /privacy page (DSR export/erasure +
  consent management) and sidebar nav (Wills, Privacy & data).

Verification (clean build copy, this environment): tsc --noEmit green for api (0
errors) and web (0 errors); api Jest 94/94 (+15: consent 4, legal-hold 4,
data-subject 3, retention 4); crypto 88/88, shared-types 5/5, config 25/25, web
vitest 2/2. Prisma engines are network-blocked in this sandbox, so prisma
generate/migrate and a real TSA/S3-Object-Lock bucket remain CI/live steps (the
api gates here run against a permissive @prisma/client stub, matching the
documented degraded-client caveat). Schema validated structurally (braces/brackets
balanced; the earlier mount-truncation corruption in the Signature model was
removed — single Signature model, 59 blocks total).

### Phase 5 exit criteria (require a live env/legal review — not runnable here)
1. E2E journey 6 green on a deployed stack (sign -> seal -> independent verify).
2. Independent seal-verify tool validated end-to-end on the deployed API.
3. External ECTA legal opinion documented (+ SA Wills Act wet-ink caveat).
4. DSR round-trip tested live: export bundle + erasure honouring a real S3 Object
   Lock bucket and an active legal hold.

## Phase 6 — Billing & Notifications (2026-07-17) ✅ CODE COMPLETE

The MVP line. Four new areas, built clean-architecture and verified; the whole
monorepo type-checks and tests green. Live exit criteria (Stripe test clocks,
E2E journey 7, MVP sign-off) remain env/business steps.

- **Billing context (`apps/api/modules/billing`):** config-driven plan catalogue
  (FREE/PREMIUM/FAMILY/PROFESSIONAL/ENTERPRISE with ZAR pricing + per-tier
  entitlements, PRD §pricing) and a stateful `Subscription` model.
  `SubscriptionService` (get/checkout/portal/cancel), `PlanService`,
  `StripePaymentGateway` (Stripe REST over fetch — no SDK dep — with HMAC webhook
  verification; offline dev fallback like TSA/KMS), and `BillingWebhookService`
  (subscription lifecycle + **14-day dunning grace → read-only**, never deleted,
  §9). `EntitlementService` resolves effective entitlements and enforces freemium
  limits: **monthly signatures** (gated in `SignatureRequestService`) and
  **document count + storage** (gated in the vault `UploadService`). Endpoints:
  `/billing/plans|subscription|entitlements|checkout|portal|cancel` + public
  `/billing/webhook`. `PrismaUsageRepository` is the cross-cutting usage read model.
- **Notification context (`apps/api/modules/notification`):** multi-channel fabric
  — email (SES), SMS + WhatsApp (Twilio), web push — behind a `ChannelSender`
  port with dev-log adapters and real-provider config seams. `NotificationService`
  resolves per-category preferences, honours the **non-disableable** rule (SECURITY
  / EMERGENCY_ACCESS always reach email), fans out and persists one row per channel.
  `PreferenceService`, `ReminderService` (worker polls `due()`), `PushService`
  (Web Push subscriptions). Models: `Notification`, `NotificationPreference`,
  `Reminder`, `PushSubscription`. Endpoints: `/notifications`(+`/preferences`),
  `/reminders`, `/push/subscriptions`.
- **Admin back-office v1 (`apps/api/modules/admin`):** role-gated (SUPPORT_AGENT /
  AUDITOR / SYSTEM_ADMIN / SUPER_ADMIN) audit-trail search (actor/type/resource/
  date) and per-user support summary (profile + subscription + usage). Read-only;
  each lookup is itself audited. `/admin/audit`, `/admin/users/:id`.
- **PWA completion + web (`apps/web`):** install-prompt banner in the app shell;
  `/billing` (plans grid, usage meters, checkout/portal/cancel, grace banner);
  `/settings/notifications` (per-category channel toggles with locked email,
  web-push opt-in, reminders); `/admin` (audit search + user lookup); sidebar nav
  (Plans & billing, Notifications). New api clients `billing-api`, `notification-api`,
  `admin-api`. Config adds STRIPE_*, SES/TWILIO/VAPID vars (dev-safe defaults).

**Verification (clean build copy, this environment):** `tsc --noEmit` green for
**api (0 errors)** and **web (0 errors)**; **api Jest 110/110** (+16: entitlement 6,
billing-webhook 3, notification 4, admin 3); crypto 88/88, shared-types 5/5,
config 25/25, web vitest 2/2. Prisma engines remain network-blocked here, so
`prisma generate`/`migrate` run in CI (api gates use the documented permissive
`@prisma/client` stub); real Stripe/SES/Twilio/VAPID wiring is a live step.

### Phase 6 exit criteria (require a live env / business sign-off — not runnable here)
1. **E2E journey 7 green** — subscribe → entitlement unlock → notification received.
2. **Dunning + proration** verified against Stripe test clocks.
3. **Notification opt-in/out** honoured end-to-end, incl. non-disableable emergency alerts.
4. **MVP checklist signed → closed beta begins.**

## Phase 7 — AI Features (2026-07-19) ✅ CODE COMPLETE

Differentiated assistance without compromising the trust model. New `ai`
bounded context (clean architecture) + plan gating + web UX; whole monorepo
type-checks and tests green.

- **`AiGateway` (PROJECT_MEMORY §2.8):** provider abstraction over the Anthropic
  Claude Messages API via fetch (no SDK dep) — `classify` / `summarise` /
  `extractKeywords` — with a **deterministic offline dev fallback**
  (keyword classifier, extractive summary, stopword keyword extraction) when
  `ANTHROPIC_API_KEY` is empty, mirroring the Stripe/TSA/KMS pattern. Model
  output is validated and degrades to the heuristic on parse failure.
- **Client-encrypted exclusion (coding-standards §10.8), type-enforced:**
  branded `ServerProcessableText` is the ONLY input the gateway accepts; its
  sole constructor `toServerProcessable()` throws for non-STANDARD vaults.
  Defence in depth: the AI search adapter joins `vaults` and filters
  `kind = 'STANDARD'` in SQL, and the type inventory for recommendations is
  filtered the same way. Guards run **before any telemetry write**, so
  `ai_usage`/`ai_insights` can never reference client-encrypted objects
  (exit criterion: zero client-encrypted objects in AI telemetry — unit-proven).
- **Classification + auto-categorisation:** `DocumentInsightService.generate`
  (opt-out → entitlement → daily budget → ownership/READY/text → exclusion →
  gateway), persists `AiInsight`, optional `apply` writes the suggested type
  onto the document; audited (`ai.insight.generated`).
- **Summaries:** same ceremony; extractive fallback in dev.
- **Completeness recommendations:** pure domain rules (`computeCompleteness`)
  over 8 essential estate documents with contextual nudges ("you have a will
  but no medical directive"); zero-token telemetry row (`rules/completeness-v1`).
- **Natural-language search:** gateway interprets the query into FTS keywords;
  retrieval via STANDARD-only Postgres FTS (`PgAiSearchAdapter`).
- **Cost budgets instrumented (exit criterion):** every request records
  feature/model/tokens/`costMicroUsd` (per-model price table, conservative
  default) in `ai_usage`; per-user daily request cap (`AI_DAILY_REQUEST_CAP`,
  default 200) + input truncation (`AI_MAX_INPUT_CHARS`) + output cap
  (`AI_MAX_OUTPUT_TOKENS`); `/ai/usage` summary surfaces both budgets.
- **Plan gating (Phase 6 dependency):** `EntitlementService.assertCanUseAiDoc`
  gates on `aiDocsPerMonth` (FREE = 10 distinct docs/month; re-runs on an
  already-counted document are free; paid tiers unlimited; dunning read-only
  blocks AI).
- **Disclosure + opt-out:** `AiPreference` (default enabled), audited enable/
  disable; every AI service checks it first. Web `/settings/ai` explains
  exactly what AI can and cannot see (client-encrypted exclusion prominent)
  with the opt-out switch + usage/budget meters; `/assistant` page (sidebar:
  Assistant, AI & your data) offers NL search, per-document insight
  (generate / generate-and-apply), and the completeness report.
- **Prisma:** `AiInsight`, `AiUsage`, `AiPreference` + `AiFeature` enum.
  **shared-types:** `AiFeature` + AI DTOs. **config:** `ANTHROPIC_API_KEY`,
  `AI_MODEL`, `AI_MAX_INPUT_CHARS`, `AI_MAX_OUTPUT_TOKENS`, `AI_DAILY_REQUEST_CAP`
  (dev-safe defaults). Endpoints: `/ai/preferences` GET/PUT,
  `/ai/documents/:id/insight` POST/GET, `/ai/recommendations`, `/ai/search`,
  `/ai/usage`.

**Verification (clean build copy, this environment):** `tsc --noEmit` green for
**api (0 errors)**, **web (0 errors)**, workers (0); **api Jest 140/140** (+30:
server-processable guard 3, completeness 4, cost 3, synthetic corpus 3, insight
service 6, NL search 3, usage/budget 3, gateway fallback 3, AI entitlements 2);
web vitest 2/2; crypto 88/88, config 25/25, shared-types 5/5, shared-kernel 8/8,
ui 5/5, design-tokens 5/5, workers 3/3. **Synthetic-corpus precision gate ≥90%
passes** (42-snippet labelled corpus, 100% on the dev heuristic). ESLint: only
the documented engine-less-Prisma `no-unsafe-*` false positives + the spec
`require-await` pattern shared with prior phases. Prisma engines remain
network-blocked here (api gates use the permissive `@prisma/client` stub);
`prisma generate`/`migrate` run in CI.

### Phase 7 exit criteria (live-env steps — not runnable here)
1. **Classification precision ≥90%** — met on the synthetic corpus with the
   offline heuristic (unit-gated in CI); re-measure with the live Claude
   gateway once `ANTHROPIC_API_KEY` is provisioned.
2. **Zero client-encrypted objects in AI telemetry (audited)** — unit-proven
   (exclusion precedes telemetry); add a periodic audit query joining
   `ai_usage`/`ai_insights` → `documents` → `vaults.kind` against a live DB.
3. **Cost-per-request budgets instrumented** — done in code (`ai_usage` +
   caps); wire a CloudWatch/Grafana dashboard + alert on live telemetry.

## Phase 8 — Organisations, Enterprise & Integrations API (2026-07-19) ✅ CODE COMPLETE

B2B workspaces and the partner integration surface. Two new bounded contexts
(`organisation`, `integration`) plus enterprise SSO inside `identity`; whole
monorepo type-checks and tests green.

- **Client-vault relationships** (`modules/organisation`): a LAWYER / DOCTOR /
  FINANCIAL_ADVISER member requests scoped read access to a client's vault;
  nothing is granted until the client accepts — the client can narrow the scope
  and their **consent is recorded first-class** (ConsentRecorder, POPIA) before
  activation; client/professional/org-admin can revoke; every transition
  audited; no-enumeration on client emails. Enforcement is unified into the
  estate **vault-relationship ABAC**: `RelationshipAccessService` now resolves
  owner → emergency grant → client relationship (FULL/CATEGORY/MEDICAL_ONLY),
  deny by default, via the `CLIENT_RELATIONSHIP_READER` port the organisation
  module exports.
- **Enterprise SSO (OAuth2/OIDC; SAML later §3)** (`identity`): per-org
  `SsoConnection` (issuer, client credentials — secret **field-encrypted** —
  endpoints, email domains, default member role; admin-gated GET/PUT
  `/organisations/:id/sso`). Login flow: `GET /auth/sso/start?email=` routes by
  domain → IdP authorization URL with single-use Redis state (10 min TTL);
  `POST /auth/sso/callback` exchanges the code (fetch, no SDK), takes identity
  from the IdP **userinfo** endpoint, enforces verified email + domain match,
  **JIT-provisions** users (random unusable password, email pre-verified) and
  org membership (default role; INVITED→ACTIVE; SUSPENDED blocked), then
  establishes the session through the same `SessionEstablisher` as password /
  passkey logins (`amr: ['sso']`). Audited.
- **Integration context** (`modules/integration`):
  - *API keys*: `dlv_sk_…`, stored **SHA-256-hashed** (prefix shown in UI),
    least-privilege scopes (`documents:read`, `usage:read`, `webhooks:manage`),
    optional expiry, revocable, issue/revoke audited. `ApiKeyGuard`
    (Bearer / X-Api-Key) + `@RequireScopes` / `PartnerScopeGuard`.
  - *Partner API v1*: `/partner/ping`, `/partner/documents` (metadata only,
    never content) — contract published at **docs/08-api/partner-openapi.yaml
    (OpenAPI 3.1)** with the versioning policy in
    **docs/08-api/partner-api-versioning.md** (URI-versioned, additive within a
    major, 12-month deprecation, stable webhook envelope + signing).
  - *Webhooks*: HTTPS-only endpoints, `whsec_…` secret shown once and stored
    field-encrypted; `WebhookDispatchService.dispatch` fans events
    (document.ready, signature.sealed, …) out to subscribed endpoints;
    `processDue` (worker pump) signs each delivery
    (`X-DLV-Signature: t=…,v1=hmac-sha256(secret, t.body)` — replay-bound),
    POSTs with timeout, retries **1m/5m/30m/2h/6h** to a 6-attempt cap
    (config), then dead-letters; delivery log at
    `/integration/webhooks/:id/deliveries`.
- **Org usage metering** (`GET /organisations/:id/usage`, admin-gated):
  seats/active members, documents, storage, signatures + AI requests this
  month, active client relationships — the read model org billing consumes.
- **Data residency**: `Organisation.dataRegion` (af-south-1 default,
  eu-west-1), admin-gated GET/PUT `/organisations/:id/residency`, audited;
  physical placement enforcement is the documented infra seam (§2.3).
- **Web**: `/organisation` hub (org switcher; members; client-access
  request/list/revoke; "Professional access to my vault" accept/decline/revoke
  for individuals; usage meters; residency switch; SSO summary; API keys and
  webhooks with show-once secrets), sidebar entry; `lib/org-api.ts`.
- **Prisma**: ClientRelationship, SsoConnection, ApiKey, Webhook,
  WebhookDelivery + status enums; Organisation gains `dataRegion`.
  **shared-types**: Phase 8 enums/DTOs + `API_KEY_SCOPES`,
  `WEBHOOK_EVENT_TYPES`, `DATA_REGIONS`. **config**: `WEBHOOK_MAX_ATTEMPTS`,
  `WEBHOOK_TIMEOUT_MS`.

**Verification (clean build copy, this environment):** `tsc --noEmit` green for
**api (0)**, **web (0)**, workers (0); **api Jest 173/173** (+33: webhook
signing 3, retry policy 2, api-key domain 3, dispatch engine 4, ApiKeyService 3,
client relationships 6, SSO 5, org admin 3, ABAC professional-access 4);
web vitest 2/2; all package suites green (crypto 88, config 25, shared-types 5,
shared-kernel 8, ui 5, design-tokens 5, workers 3). `partner-openapi.yaml`
parses as valid YAML. ESLint on new modules: only the documented
engine-less-Prisma `no-unsafe-*` + spec `require-await` patterns. Prisma
`generate`/`migrate` remain CI steps (stubbed client here).

### Phase 8 exit criteria (live-env steps — not runnable here)
1. **Org onboarding E2E green** — journey: create org → configure SSO → staff
   SSO login (JIT) → professional requests client access → client consents →
   professional reads scoped document. Extend the gated Playwright + API e2e
   harness against a deployed stack (specs to add under `apps/web/e2e`).
2. **Partner API contract published** — the OpenAPI 3.1 file + versioning
   policy are authored; publish to the developer portal and add a CI lint
   (spectral) + contract-drift check against the running API.
3. **Webhook delivery ≥99.9% within 5 min (soak test)** — run the delivery
   engine against a receiver harness in staging; wire the worker to poll
   `WebhookDispatchService.processDue()` (BullMQ repeatable job) and dashboards
   on `webhook_deliveries` status/latency.

## Phase 9 — Hardening, Pentest & SOC 2 Readiness (2026-07-20) ✅ CODE COMPLETE (in-repo)

Production-grade assurance work. Scope frozen at feature-complete (Phases 2–8).
All in-repo deliverables built and verified green; the remaining exit criteria
are inherently live/external (pentest, DR drill execution, SOC 2 window,
go/no-go).

- **Security hardening (`apps/api`):** `main.ts` now applies the documented
  header posture (`common/http/security-headers.ts`) instead of Helmet
  defaults — CSP mirroring security-architecture §headers (self-first; Stripe
  for scripts/frames; `frame-ancestors 'none'`, `object-src 'none'`), HSTS
  gated on `HSTS_ENABLED` (2-year preload), referrer policy, COOP/CORP,
  X-Frame-Options deny. CORS is an explicit allow-list (`corsOrigins`, deny by
  default). Body size capped via `useBodyParser` (`MAX_REQUEST_BODY_BYTES`).
  RFC 9116 `/.well-known/security.txt` (`well-known` module). New config:
  `CORS_ALLOWED_ORIGINS`, `HSTS_ENABLED`, `MAX_REQUEST_BODY_BYTES`,
  `SECURITY_CONTACT`. (CI already runs CodeQL, gitleaks, osv-scanner, hadolint.)
- **Authz matrix (M-02 launch gate):** `authorization/authz-matrix.spec.ts`
  asserts all **15 roles × 11 subjects × 4 actions** against an explicit
  expected-allow table — fails closed, proving deny-by-default and the
  SUPPORT_AGENT "no document contents" privacy invariant.
- **E2E journeys 3–8** authored (Playwright, self-skipping) alongside the
  existing journey 2, plus **journey 9 (WCAG 2.2 AA)** running axe-core from CDN
  with structural fallbacks: sharing/secure-link, emergency-access,
  death-verification, signature seal+verify, billing/entitlements, org
  onboarding + partner-API-key auth. Shared `e2e/helpers.ts`; the `e2e.yml`
  workflow now runs all journeys and passes an optional 2nd seeded account.
- **DR programme:** `docs/06-engineering/runbooks/dr-failover.md` (the runbook
  the deployment strategy referenced but that was missing),
  `docs/09-operations/dr-drill-log.md`, and `scripts/dr-drill-check.mjs`
  (dependency-free `preflight` + `measure` that computes RPO/RTO against the
  15-min/4-h targets and gates the drill; self-tested).
- **SOC 2 readiness:** `docs/09-compliance/soc2-readiness.md` (TSC CC1–CC9 +
  Availability + Confidentiality control matrix mapped to implemented
  mechanisms and evidence), `policy-index.md`, `data-processing.md`
  (POPIA operator / GDPR processor + sub-processors).
- **Accessibility:** `docs/09-compliance/accessibility-audit.md` (WCAG 2.2 AA
  success-criterion checklist + method + two flagged Review items) with the
  automated axe pass wired in journey 9.
- **Pentest readiness:** `docs/09-compliance/pentest-scope.md` (scope, RoE,
  priority abuse cases, in-house automated baseline) and
  `ga-go-no-go-checklist.md` (engineering/design/security/legal sign-off).

**Verification (clean build copy, this environment):** `tsc --noEmit` green for
**api (0)**, **web (0, incl. all e2e specs)**, workers (0); **api Jest 195/195**
(+22: authz matrix 19, security-headers 3, security.txt 1 — offset by matrix
consolidation); web vitest 2/2; config 25/25; all package suites green.
`dr-drill-check.mjs` self-tests pass and gate on breach. ESLint clean on new
files (only the documented engine-less-Prisma false positives elsewhere).

### Phase 9 exit criteria (live/external — not runnable here)
1. **Zero open critical/high pentest findings** — engage the external tester
   against staging using `pentest-scope.md`; the automated baseline (authz
   matrix, pipeline abuse, ABAC, webhook/API-key, header) is green.
2. **DR drill within targets** — execute the `dr-failover.md` runbook; record
   RPO/RTO via `dr-drill-check.mjs` into the drill log (targets 15 min / 4 h).
3. **SOC 2 observation window started** — confirm evidence automation, then
   open the 6-month Type II window per `soc2-readiness.md`.
4. **Accessibility audit passed** — run journey 9 axe pass on staging; close the
   two 2.2 Review items (2.4.11, 3.3.7).
5. **Go/no-go review passed** — complete `ga-go-no-go-checklist.md`. Then Phase 10 — GA Launch.

## Phase 10 — GA Launch (2026-07-20) ✅ LAUNCH ARTEFACTS CODE COMPLETE

The final phase. This is a launch-execution phase, not a build phase — the
codebase was feature- and hardening-complete after Phase 9. All in-repo launch
artefacts are authored and verified; the remaining exit criteria are the live
launch itself and the 2-week stabilisation watch.

- **GA launch runbook** (`docs/09-operations/ga-launch-runbook.md`): roles,
  T-minus prep, a staged canary cutover (10→25→50→100% with per-step
  AnalysisRun gates + smoke journeys 2/6/7), public-gate flip, a feature-flag
  plan (AI/WhatsApp/partner-API default-off until stable), explicit rollback
  triggers, and a < 5-minute rollback procedure reusing the canary abort path.
- **SLOs & error budgets** (`docs/09-operations/slo-monitoring-plan.md`): nine
  SLOs (API availability/latency, auth, upload success/latency, signature seal,
  billing webhook, partner webhook, notifications) with SLIs, 28-day budgets,
  burn-rate paging vs ticketing, an error-budget freeze policy, and the 14-day
  war-room watch whose exit is *all SLOs met + every budget ≥ 50% remaining*.
- **GA sign-off** (`docs/09-operations/ga-sign-off.md`): launch-execution
  readiness + the four required sign-offs (engineering, design, security,
  legal) and the launch commander's proceed/hold.
- **Release process** (`docs/09-operations/release-process.md`) + **v1.0.0
  release notes** (`release-notes-v1.0.0.md`): SemVer, release-please tag
  automation, gated two-approver prod promotion, release rollback.
- **`scripts/slo-watch-check.mjs`**: dependency-free evaluator of the 14-day
  watch snapshot — checks every SLO against target and ≥ 50% budget remaining
  over a ≥ 14-day window, exits non-zero on any breach, and gates the
  status-to-Live flip. Self-tested (pass + breach cases).
- **PROJECT_MEMORY §9**: launch status recorded — **GA-ready (v1.0.0)**, flips
  to **Live** once the watch passes.

**Verification (this environment):** `slo-watch-check.mjs --self-test` passes and
gates on breach; `dr-drill-check.mjs` (Phase 9) still passes. No code changed in
this phase, so the Phase 9 green build stands (api Jest 195/195, api/web/workers
tsc 0, all package suites green). All Phase 10 YAML/docs authored; nothing to
compile.

### Phase 10 exit criteria (live launch — not runnable here)
1. **GA checklist signed** by engineering, design, security, legal
   (`ga-sign-off.md`) after the Phase 9 go/no-go.
2. **Execute the launch** per `ga-launch-runbook.md` (canary cutover, smoke,
   public-gate flip) and tag **v1.0.0**.
3. **2-week watch:** SLOs met and every error budget ≥ 50% remaining
   (`slo-monitoring-plan.md`; evidence via `slo-watch-check.mjs`).
4. **Flip PROJECT_MEMORY §9 launch status to "Live"** — closes the roadmap.

---

## Roadmap complete

All ten phases are code-complete. Phases 2–8 delivered the product
(foundation → vault → sharing/estate → signatures/compliance →
billing/notifications → AI → organisations/enterprise/integrations); Phase 9
hardened it (headers, authz matrix, E2E journeys, DR, SOC 2 pack, a11y,
pentest readiness); Phase 10 prepared the launch (runbook, SLOs, sign-off,
release). Every remaining item across Phases 2–10 is a live-environment,
external-audit, or business sign-off step that cannot run in this sandbox —
there is no further in-repo build work outstanding.
