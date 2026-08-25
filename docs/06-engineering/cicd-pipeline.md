# Digital Legacy Vault — CI/CD Pipeline

| Document control | |
|---|---|
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Engineering Team |
| Related | `docs/06-engineering/git-strategy.md`, `docs/06-engineering/deployment-strategy.md`, `docs/06-engineering/testing-strategy.md`, `PROJECT_MEMORY.md` §3, §8 |

---

## 1. Overview

GitHub Actions is the CI/CD engine; Argo CD performs all cluster deployments (GitOps — pipelines never `kubectl apply`). Promotion is artefact-based: one image digest travels dev → staging → prod.

```
PR ──► PR pipeline (quality + security gates) ──► squash merge to main
main ──► build/publish to ECR ──► Argo CD Image Updater ──► dev (auto)
tag vX.Y.Z ──► staging promotion (E2E, DAST, k6) ──► manual approval ──► prod canary (Argo Rollouts)
infra/** ──► terraform plan (PR) / apply (main, per env with approval)
```

Standards applying to every workflow:

- **OIDC to AWS only** — `aws-actions/configure-aws-credentials` with role assumption per environment account; **no stored AWS keys** anywhere in GitHub.
- Least-privilege `permissions:` blocks per job; `secrets: {}` default.
- Runners: `ubuntu-24.04`; Node 22 LTS; pnpm 9 via corepack; Turborepo remote cache (S3-backed, signed).
- All third-party actions pinned to commit SHAs (shown as `@<sha> # vX` below; SHAs resolved at implementation time via Renovate).
- Concurrency groups cancel superseded runs per ref.

## 2. PR pipeline

Runs on every PR to `main`. All jobs are required checks (git-strategy.md §4). Target wall-clock: <12 min via parallelism + caching.

| Stage | Tooling | Fails PR when |
|---|---|---|
| Install & cache | pnpm + Turborepo remote cache | install fails / lockfile drift (`--frozen-lockfile`) |
| Commitlint | commitlint on PR title | title not Conventional Commit |
| Lint | ESLint flat config incl. boundaries plugin | any error |
| Typecheck | `tsc -b` per workspace | any error |
| Unit tests | Vitest (+ Jest for Nest where needed), coverage | failure or coverage below gates (domain ≥90%, overall ≥80%) |
| Build | `turbo build` (Next + Nest + packages) | build error |
| Prisma migrate diff | `prisma migrate diff` shadow-DB check + drift detection | schema/migration mismatch, or destructive statement without `migration:destructive-approved` label |
| Secret scanning | gitleaks (full history on PR range) | any finding |
| SAST | CodeQL (javascript-typescript) | new high/critical alert |
| Dependency audit | `pnpm audit` + osv-scanner | high/critical vuln without recorded exception |
| Docker build + scan | Buildx (api, web, workers) → Trivy image scan | HIGH/CRITICAL vulns (unfixed allow-listed via `.trivyignore` with expiry) |
| SBOM | syft → SPDX JSON, uploaded as artefact + attested | generation failure |

### PR workflow skeleton

`.github/workflows/pr.yml`:

```yaml
name: pr

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: pr-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '22'
  TURBO_TEAM: dlv
  TURBO_REMOTE_CACHE_SIGNATURE_KEY: ${{ secrets.TURBO_CACHE_SIGNING_KEY }}

jobs:
  setup:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@<sha> # v4
      - uses: pnpm/action-setup@<sha> # v4
      - uses: actions/setup-node@<sha> # v4
        with: { node-version: ${{ env.NODE_VERSION }}, cache: pnpm }
      - run: pnpm install --frozen-lockfile

  commitlint:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@<sha> # v4
      - uses: pnpm/action-setup@<sha> # v4
      - uses: actions/setup-node@<sha> # v4
        with: { node-version: ${{ env.NODE_VERSION }}, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Validate PR title (squash commit message)
        run: echo "$PR_TITLE" | pnpm commitlint
        env:
          PR_TITLE: ${{ github.event.pull_request.title }}

  quality:
    needs: setup
    runs-on: ubuntu-24.04
    strategy:
      matrix:
        task: [lint, typecheck, build]
    steps:
      - uses: actions/checkout@<sha> # v4
      - uses: pnpm/action-setup@<sha> # v4
      - uses: actions/setup-node@<sha> # v4
        with: { node-version: ${{ env.NODE_VERSION }}, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo ${{ matrix.task }} --cache-dir=.turbo

  unit-tests:
    needs: setup
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@<sha> # v4
      - uses: pnpm/action-setup@<sha> # v4
      - uses: actions/setup-node@<sha> # v4
        with: { node-version: ${{ env.NODE_VERSION }}, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test:unit -- --coverage
      - name: Enforce coverage gates
        run: pnpm run coverage:check   # domain >=90%, overall >=80%
      - uses: actions/upload-artifact@<sha> # v4
        with: { name: coverage, path: coverage/ }

  prisma-migrate-check:
    needs: setup
    runs-on: ubuntu-24.04
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: ci, POSTGRES_DB: dlv_shadow }
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U postgres" --health-interval 5s
          --health-timeout 5s --health-retries 10
    steps:
      - uses: actions/checkout@<sha> # v4
      - uses: pnpm/action-setup@<sha> # v4
      - uses: actions/setup-node@<sha> # v4
        with: { node-version: ${{ env.NODE_VERSION }}, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Apply committed migrations to shadow DB
        run: pnpm --filter api exec prisma migrate deploy
        env: { DATABASE_URL: postgresql://postgres:ci@localhost:5432/dlv_shadow }
      - name: Fail on schema drift (schema.prisma vs migrations)
        run: |
          pnpm --filter api exec prisma migrate diff \
            --from-url "postgresql://postgres:ci@localhost:5432/dlv_shadow" \
            --to-schema-datamodel prisma/schema.prisma \
            --exit-code
      - name: Block unlabelled destructive migrations
        run: node scripts/check-destructive-migrations.mjs
        env:
          PR_LABELS: ${{ join(github.event.pull_request.labels.*.name, ',') }}

  gitleaks:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@<sha> # v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@<sha> # v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  codeql:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@<sha> # v4
      - uses: github/codeql-action/init@<sha> # v3
        with: { languages: javascript-typescript, queries: security-extended }
      - uses: github/codeql-action/analyze@<sha> # v3

  dependency-audit:
    needs: setup
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@<sha> # v4
      - uses: pnpm/action-setup@<sha> # v4
      - uses: actions/setup-node@<sha> # v4
        with: { node-version: ${{ env.NODE_VERSION }}, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level high
      - uses: google/osv-scanner-action@<sha> # v2
        with: { scan-args: --lockfile pnpm-lock.yaml }

  docker:
    needs: [quality, unit-tests]
    runs-on: ubuntu-24.04
    strategy:
      matrix:
        app: [api, web, workers]
    steps:
      - uses: actions/checkout@<sha> # v4
      - uses: docker/setup-buildx-action@<sha> # v3
      - name: Build image (not pushed on PR)
        uses: docker/build-push-action@<sha> # v6
        with:
          file: apps/${{ matrix.app }}/Dockerfile
          tags: dlv/${{ matrix.app }}:pr-${{ github.event.number }}
          load: true
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Trivy scan
        uses: aquasecurity/trivy-action@<sha> # v0.28
        with:
          image-ref: dlv/${{ matrix.app }}:pr-${{ github.event.number }}
          severity: HIGH,CRITICAL
          exit-code: '1'
          ignore-unfixed: true
      - name: SBOM
        uses: anchore/sbom-action@<sha> # v0
        with:
          image: dlv/${{ matrix.app }}:pr-${{ github.event.number }}
          format: spdx-json
          artifact-name: sbom-${{ matrix.app }}.spdx.json
```

## 3. Main pipeline (merge to `main` → dev)

Trigger: push to `main`. Steps:

1. Re-run build + unit tests (defence against merge-skew; merge queue makes failures rare).
2. **Publish images to ECR** — repositories `dlv/api`, `dlv/web`, `dlv/workers` in the shared tooling account; tags: `sha-<gitsha>` (immutable), `main`. Push via OIDC role `gha-ecr-push`. Images signed with cosign (keyless, OIDC identity); SBOM attached as attestation.
3. ECR scan-on-push (Inspector) supplements the PR-time Trivy scan.
4. **Deploy to dev:** Argo CD Image Updater (running in the dev cluster) tracks `sha-*` tags on `dlv/*` and writes the new digest back to `infra/helm/env/dev/values.yaml` via a signed Git commit (`chore(release): dev image bump …`); Argo CD syncs automatically. The pipeline itself never touches the cluster.
5. Post-sync smoke: Argo CD PostSync hook Job runs `scripts/smoke.sh` (health, readiness, one authenticated round-trip). Failure marks the app Degraded and alerts `#dlv-deploys`.

## 4. Staging promotion (tag `vX.Y.Z` or `vX.Y.Z-rc.N`)

Trigger: release tag (git-strategy.md §5). The tag resolves to the exact image digests already built from that commit — **no rebuild**.

1. **Promote manifests:** workflow PRs the digest into `infra/helm/env/staging/values.yaml`; auto-merge on green; Argo CD syncs staging.
2. **E2E — Playwright** against staging URL: full critical-journey suite (testing-strategy.md §6), seeded synthetic tenants, trace/video artefacts on failure.
3. **DAST — OWASP ZAP baseline** scan against staging web + API (authenticated context, safe/passive plus a curated active subset); new medium+ alerts fail the run.
4. **Performance smoke — k6:** 10-minute scenario mix (login, list vault, upload metadata path, timeline query) asserting p95 API < 300 ms and error rate < 0.5% (budgets in testing-strategy.md §9).
5. Green run marks the tag `staging-verified` (GitHub deployment status) — precondition for the prod job.

## 5. Production deploy

Trigger: manual dispatch of `deploy-prod` for a `staging-verified` tag.

- **Environment gate:** GitHub Environment `prod` requires manual approval (2 approvers: engineering lead + on-call) and a 10-minute wait timer; deploy freeze windows enforced via environment protection (deployment-strategy.md §9).
- **Canary via Argo Rollouts:** manifest PR to `infra/helm/env/prod/values.yaml`; Argo CD syncs; Rollout executes 5% → 25% → 50% → 100% with AnalysisRuns between steps (error rate, p95 latency, upload-pipeline success — metric details in deployment-strategy.md §5).
- **Auto-rollback:** any failed AnalysisRun aborts and returns traffic to stable; the workflow reverts the manifest commit and pages on-call.
- DB migrations run as a pre-sync init Job (expand/contract only — deployment-strategy.md §6), so rollback never requires a down-migration.

### Deploy workflow skeleton

`.github/workflows/deploy.yml`:

```yaml
name: deploy

on:
  push:
    tags: ['v*.*.*']            # staging promotion
  workflow_dispatch:            # prod promotion
    inputs:
      tag:
        description: staging-verified tag to promote to prod
        required: true

permissions:
  contents: write
  id-token: write               # OIDC to AWS

concurrency:
  group: deploy-${{ github.event.inputs.tag || github.ref_name }}
  cancel-in-progress: false

jobs:
  resolve-digests:
    runs-on: ubuntu-24.04
    outputs:
      api: ${{ steps.d.outputs.api }}
      web: ${{ steps.d.outputs.web }}
      workers: ${{ steps.d.outputs.workers }}
    steps:
      - uses: aws-actions/configure-aws-credentials@<sha> # v4
        with:
          role-to-assume: arn:aws:iam::<TOOLING_ACCOUNT>:role/gha-ecr-read
          aws-region: af-south-1
      - name: Resolve image digests for tag commit
        id: d
        run: |
          SHA=$(git rev-list -n1 "${{ github.event.inputs.tag || github.ref_name }}")
          for app in api web workers; do
            DIGEST=$(aws ecr describe-images --repository-name "dlv/$app" \
              --image-ids imageTag="sha-${SHA}" \
              --query 'imageDetails[0].imageDigest' --output text)
            echo "$app=$DIGEST" >> "$GITHUB_OUTPUT"
          done

  promote-staging:
    if: github.event_name == 'push'
    needs: resolve-digests
    runs-on: ubuntu-24.04
    environment: staging
    steps:
      - uses: actions/checkout@<sha> # v4
        with: { token: ${{ secrets.GITOPS_BOT_TOKEN }} }
      - name: Bump staging manifests to release digests
        run: |
          ./scripts/bump-env-images.sh staging \
            "${{ needs.resolve-digests.outputs.api }}" \
            "${{ needs.resolve-digests.outputs.web }}" \
            "${{ needs.resolve-digests.outputs.workers }}"
          git config user.name dlv-gitops-bot
          git config user.email gitops@stellr-net.com
          git commit -am "chore(release): promote ${{ github.ref_name }} to staging"
          git push
      - name: Wait for Argo CD staging sync + health
        run: ./scripts/argocd-wait.sh staging dlv --timeout 900
        env: { ARGOCD_AUTH_TOKEN: ${{ secrets.ARGOCD_STAGING_RO_TOKEN }} }

  e2e:
    needs: promote-staging
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@<sha> # v4
      - uses: pnpm/action-setup@<sha> # v4
      - uses: actions/setup-node@<sha> # v4
        with: { node-version: '22', cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium webkit
      - run: pnpm turbo test:e2e
        env:
          E2E_BASE_URL: https://staging.dlv.stellr-net.com
          E2E_SEED_TOKEN: ${{ secrets.E2E_SEED_TOKEN }}
      - uses: actions/upload-artifact@<sha> # v4
        if: failure()
        with: { name: playwright-traces, path: playwright-report/ }

  dast:
    needs: promote-staging
    runs-on: ubuntu-24.04
    steps:
      - uses: zaproxy/action-baseline@<sha> # v0.12
        with:
          target: https://staging.dlv.stellr-net.com
          rules_file_name: .zap/rules.tsv
          fail_action: true

  perf-smoke:
    needs: promote-staging
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@<sha> # v4
      - uses: grafana/setup-k6-action@<sha> # v1
      - run: k6 run tests/performance/staging-smoke.js
        env:
          K6_BASE_URL: https://staging.dlv.stellr-net.com
          # thresholds in-script: http_req_duration p(95)<300, error rate<0.5%

  mark-verified:
    needs: [e2e, dast, perf-smoke]
    runs-on: ubuntu-24.04
    steps:
      - name: Mark tag staging-verified
        run: gh api repos/${{ github.repository }}/statuses/$(git rev-list -n1 ${{ github.ref_name }}) \
              -f state=success -f context=staging-verified
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }

  deploy-prod:
    if: github.event_name == 'workflow_dispatch'
    needs: resolve-digests
    runs-on: ubuntu-24.04
    environment: prod           # manual approval + wait timer + freeze windows
    steps:
      - uses: actions/checkout@<sha> # v4
        with: { token: ${{ secrets.GITOPS_BOT_TOKEN }} }
      - name: Verify tag is staging-verified
        run: ./scripts/assert-status.sh "${{ github.event.inputs.tag }}" staging-verified
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
      - name: Bump prod manifests (canary rollout begins on sync)
        run: |
          ./scripts/bump-env-images.sh prod \
            "${{ needs.resolve-digests.outputs.api }}" \
            "${{ needs.resolve-digests.outputs.web }}" \
            "${{ needs.resolve-digests.outputs.workers }}"
          git config user.name dlv-gitops-bot
          git config user.email gitops@stellr-net.com
          git commit -am "chore(release): promote ${{ github.event.inputs.tag }} to prod"
          git push
      - name: Watch Argo Rollouts canary to completion
        run: ./scripts/rollouts-wait.sh prod dlv-api --timeout 3600
        env: { ARGOCD_AUTH_TOKEN: ${{ secrets.ARGOCD_PROD_RO_TOKEN }} }
      - name: Revert manifest commit on rollout abort
        if: failure()
        run: |
          git revert --no-edit HEAD
          git push
          ./scripts/page-oncall.sh "prod canary aborted for ${{ github.event.inputs.tag }}"
```

## 6. Terraform workflow (OIDC, no stored keys)

`.github/workflows/terraform.yml` (summary):

- **PR touching `infra/terraform/**`:** `fmt -check`, `validate`, tflint, Checkov policy scan, then `terraform plan` per environment workspace using OIDC roles (`gha-terraform-plan-dev|staging|prod`, read-only + plan permissions). Plan output posted as a PR comment (secrets masked); `-detailed-exitcode` distinguishes no-op.
- **Merge to `main`:** `terraform apply` runs per environment as separate jobs gated by GitHub Environments — `dev` auto-applies; `staging` and `prod` require the same environment approvals as deploys, assuming `gha-terraform-apply-<env>` roles in each AWS account.
- State: S3 backend + DynamoDB locking per account; state bucket access restricted to the apply roles.
- Drift detection: scheduled nightly `plan` on all envs; non-empty plan opens an issue and alerts `#dlv-platform`.

## 7. Scheduled & auxiliary workflows

| Workflow | Schedule | Purpose |
|---|---|---|
| `codeql-scheduled` | weekly | full CodeQL on default branch |
| `dependency-refresh` | weekly | Renovate PRs (grouped), lockfile maintenance |
| `zap-full` | weekly vs staging | full active DAST (beyond baseline) |
| `dr-drill` | quarterly (manual trigger, calendared) | eu-west-1 failover exercise (deployment-strategy.md §8) |
| `stale-branches` | daily | flags branches >3 days old (git-strategy.md §2) |
| `secret-rotation` | on Secrets Manager rotation events | rolling restart of consumers (deployment-strategy.md §8) |

## 8. Pipeline security

- GitHub Environments: `dev` (no gate), `staging` (platform-team approval optional), `prod` (2 approvals + wait timer + freeze windows).
- OIDC trust policies pin `repo:stellr-sa/digital-legacy-vault` + environment claim; roles are per-purpose (ecr-push, terraform-plan/apply per env, argocd-read).
- `GITOPS_BOT_TOKEN` is a fine-grained PAT limited to `infra/helm/env/**` contents write; all other jobs use the ephemeral `GITHUB_TOKEN`.
- Artefact attestations (SLSA provenance) generated for all published images; Argo CD admission (Kyverno) verifies cosign signature + provenance before sync in staging/prod.
- No workflow may echo secrets; `pull_request_target` is banned; fork PRs get no secrets and skip deploy-adjacent jobs.
