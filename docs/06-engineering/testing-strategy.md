# Digital Legacy Vault — Testing Strategy

| Document control | |
|---|---|
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Engineering Team |
| Related | `docs/06-engineering/cicd-pipeline.md`, `docs/06-engineering/coding-standards.md`, `PROJECT_MEMORY.md` §3, §7 |

---

## 1. Test pyramid & coverage targets

```
        ▲  E2E (Playwright) — critical journeys only
       ▲▲  Contract (OpenAPI/GraphQL schema)
      ▲▲▲  Integration (Testcontainers: Postgres 16, Redis 7, real Prisma)
    ▲▲▲▲▲  Unit (Vitest/Jest) — the bulk
```

| Layer | Coverage gate (CI-enforced, lines + branches) |
|---|---|
| `domain/` in every bounded context | **≥ 90%** |
| `application/` | ≥ 85% |
| Overall (monorepo) | **≥ 80%** |
| `packages/crypto` | 100% lines, mutation testing (Stryker) score ≥ 85% |

Gates fail the PR pipeline (cicd-pipeline.md §2). Coverage may never be lowered without an ADR. Generated code (Prisma client, OpenAPI client, GraphQL codegen) is excluded from denominators.

## 2. Unit tests

- **Tooling:** Vitest across packages and `apps/web`; Jest remains acceptable inside `apps/api` where Nest testing utilities require it — one runner per package, never both.
- **Scope:** domain entities/invariants (e.g. `EmergencyAccessRequest` quorum rules, hash-chain computation, money arithmetic in minor units), use-case handlers with in-memory port fakes, pure UI logic, Zod schemas.
- **Rules:** no I/O, no network, no timers without fake clocks (`vi.useFakeTimers`); test names describe behaviour ("rejects grant activation before delay window elapses"); one behavioural assertion focus per test; fakes over mocks — port interfaces get hand-written in-memory fakes in `test/fakes/`.
- Property-based tests (fast-check) for crypto envelope round-trips, UUIDv7 ordering, and cursor-pagination encoding.

## 3. Integration tests

- **Tooling:** Testcontainers — `postgres:16`, `redis:7`; **real Prisma client** against the containerised DB with migrations applied via `prisma migrate deploy` (validates the migration set on every run).
- **Scope:** repository implementations (Prisma row ⇆ entity mapping, tenant scoping, field-level encryption columns round-trip), BullMQ queue flows (quarantine pipeline stages with a stubbed ClamAV verdict), transactional behaviour + outbox event publication, audit hash-chain persistence (each event stores SHA-256 of predecessor — verified in sequence).
- AWS dependencies (S3, KMS, SES) run against LocalStack in integration tests; a nightly job runs the same suite against a sandboxed real-AWS account in `af-south-1` to catch LocalStack fidelity gaps.
- Each test file owns an isolated schema (template-database cloning) — no shared mutable state; suites run in parallel.

## 4. Contract tests

- **REST:** the committed OpenAPI 3.1 spec is the contract. CI (a) regenerates the spec from `@nestjs/swagger` and fails on uncommitted diff, (b) runs schemathesis against a running API instance to fuzz conformance (status codes, problem+json shape per RFC 9457, cursor pagination envelope), (c) breaking-change detection via `oasdiff` — breaking diffs require a MAJOR version + ADR.
- **GraphQL:** schema snapshot committed; `graphql-inspector` fails on breaking changes without the `graphql:breaking-approved` label.
- **Webhooks (integration context):** JSON-schema fixtures per event type; producer tests validate emitted payloads against them; consumers in `apps/web`/partners pin schema versions.
- **Frontend client:** `packages/api-client` regenerated in CI from the same spec; type errors surface contract drift at compile time.

## 5. E2E tests (Playwright)

Run against staging on every release tag (cicd-pipeline.md §4); a smoke subset (journeys 1, 3, 6) runs nightly against dev. Chromium + WebKit projects; mobile viewport variant for journeys 1–3.

**Critical journeys (the suite):**

1. **Sign-up & secure vault creation** — register, verify email, TOTP enrolment, passkey enrolment, first login.
2. **Document upload pipeline** — upload PDF → quarantine → scan → promote → appears with hash + encrypted status; rejected EICAR file shows plain-language rejection.
3. **Share & secure link** — share document with a beneficiary account, open via secure link + QR, access recorded in timeline.
4. **Estate setup** — add beneficiary + executor, configure emergency access (quorum + delay), verify owner notification fires.
5. **Emergency access flow** — executor requests access → quorum approval → delay elapse (clock-forwarded via test seam) → grant → full audit trail visible.
6. **Signature ceremony** — draw/type signature, consent, seal; verify seal summary (digest, RFC 3161 timestamp) and Object-Lock status flag.
7. **Billing** — upgrade to Premium via Stripe test mode, webhook processes, entitlements change; downgrade path.
8. **Client-Encrypted Vault** — client-side encrypt upload; verify OCR/AI/search absent for that object; recovery-kit generation.

Conventions: seeded synthetic tenants via API (`E2E_SEED_TOKEN`), no UI-based setup for preconditions; `data-testid` selectors; traces/videos retained on failure; zero tolerance for flakiness — flaky test is quarantined within 24h and fixed or deleted within a sprint.

## 6. Security testing

| Activity | Tool | Cadence | Gate |
|---|---|---|---|
| SAST | CodeQL (security-extended) | every PR + weekly full | new high/critical fails |
| Secret scanning | gitleaks | every PR + push protection | any finding fails |
| Dependency scanning | pnpm audit + osv-scanner + Renovate | every PR + weekly | high/critical fails |
| Container scanning | Trivy (PR) + ECR/Inspector (push) | every image | HIGH/CRITICAL fails |
| DAST | OWASP ZAP baseline (release) + full active (weekly, staging) | per §4 pipeline | new medium+ fails release |
| IaC scanning | Checkov + tflint | every infra PR | policy violation fails |
| **External penetration test** | independent firm, scope incl. emergency-access & signature flows | **annually** + before GA (roadmap Phase 9) | criticals block release; report to risk register |
| Abuse-case tests | Jest/Vitest suites for authz matrix | every PR | any failure |

The authz matrix suite enumerates role × resource × action (roles per PROJECT_MEMORY §6) and asserts deny-by-default: any endpoint reachable without an explicit policy fails the suite.

## 7. Accessibility testing

- **Automated:** `@axe-core/playwright` runs on every E2E journey page-state; violations of WCAG 2.2 A/AA rules fail the run. Storybook interaction tests run axe per component in the PR pipeline.
- **Manual:** each release, a screen-reader pass (NVDA + Chrome on Windows; VoiceOver + Safari on macOS/iOS) over journeys 1, 2, 4, 5, 6; keyboard-only walkthrough of the same; 200% zoom and forced-colours checks quarterly.
- Design-system compliance (focus rings, ≥24px targets, contrast token pairs) is asserted in component tests, not left to page audits.

## 8. Performance testing (k6)

**Budgets (CI-enforced thresholds):**

| Metric | Budget |
|---|---|
| API p95 (all read endpoints) | **< 300 ms** |
| API p99 | < 800 ms |
| GraphQL timeline query p95 | < 400 ms |
| Upload pipeline SLA (quarantine → clean, files ≤ 25 MB) | p95 < 60 s, p99 < 180 s |
| Web LCP (staging, 4G profile) | < 2.5 s |
| Error rate under test load | < 0.5% |

**Scenarios (`tests/performance/`):**

- `staging-smoke.js` — 10 min, 20 VU mix (login, vault list, document metadata, timeline) — runs in every release pipeline.
- `load-baseline.js` — weekly: ramp to 200 VU steady, 30 min, full read/write mix.
- `upload-pipeline.js` — weekly: 50 concurrent multipart uploads, asserts pipeline SLA via polling the status endpoint.
- `stress-spike.js` — monthly: 10× spike over baseline to observe HPA + queue-depth behaviour; informational, no gate.

Results shipped to CloudWatch + Grafana; budget regressions >10% open an issue automatically.

## 9. Chaos & DR drills

- **Chaos (staging, monthly):** kill API pods mid-upload (pipeline must resume), Redis failover (sessions survive via token model), Postgres failover (RDS Multi-AZ, <60 s write outage tolerated), ClamAV worker starvation (queue backpressure, no promotion bypass — security invariant §7.5).
- **DR drill (quarterly, per deployment-strategy.md §8):** restore from cross-region replicas in `eu-west-1`, validate RPO ≤ 15 min / RTO ≤ 4 h, run E2E smoke against the DR stack, document timing gaps.
- Game-day runbooks stored in `docs/06-engineering/runbooks/`; every drill produces a report + follow-up issues.

## 10. Test data management

- **Factories:** `packages/test-factories` — typed factories per canonical entity (PROJECT_MEMORY §5) built on fishery + faker with a fixed seed per run for reproducibility; UUIDv7 IDs generated with controllable clocks.
- **No production data in any non-prod environment. Ever.** Enforced by policy and by network design (non-prod accounts have no read path to prod data stores).
- **Anonymisation:** if a prod incident requires data-shaped reproduction, the `scripts/anonymise-extract` tool produces a structurally identical, fully synthetic dataset (names/IDs/documents replaced, encrypted fields regenerated) — output reviewed by the security owner before leaving the prod account.
- Synthetic document corpus (PDFs, images, EICAR, oversized, wrong-magic-byte files) versioned in `tests/fixtures/corpus/` for pipeline tests.
- Staging is reseeded weekly to a known baseline; E2E tenants are namespaced and garbage-collected nightly.

## 11. Quality gates per pipeline stage

| Stage | Gates (all blocking unless noted) |
|---|---|
| Pre-commit (lefthook) | format, staged lint (advisory — CI is authoritative) |
| PR | lint, typecheck, unit + coverage (≥90% domain / ≥80% overall), build, migrate diff, contract diff, gitleaks, CodeQL, dependency audit, Trivy, axe component checks |
| Merge → dev | build/publish, image signing, post-sync smoke |
| Release tag → staging | full Playwright E2E, ZAP baseline, k6 smoke vs budgets |
| Prod deploy | manual approval ×2, canary AnalysisRuns (error rate, p95, pipeline success) with auto-rollback |
| Scheduled | weekly full DAST + load baseline, monthly chaos, quarterly DR drill, annual pentest |
