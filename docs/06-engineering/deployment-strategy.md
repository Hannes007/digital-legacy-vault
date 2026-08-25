# Digital Legacy Vault — Deployment Strategy

| Document control | |
|---|---|
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Engineering Team |
| Related | `docs/06-engineering/cicd-pipeline.md`, `docs/06-engineering/git-strategy.md`, `PROJECT_MEMORY.md` §2.3, §2.6, §3, §8 |

---

## 1. Environments

Three environments (PROJECT_MEMORY §8), each in a **separate AWS account** under one Organization (plus a `tooling` account for ECR, Turbo cache, and CI roles):

| | dev | staging | prod |
|---|---|---|---|
| AWS account | `dlv-dev` | `dlv-staging` | `dlv-prod` |
| Region | af-south-1 | af-south-1 | af-south-1 (+ eu-west-1 DR) |
| EKS | 1 cluster, small nodes, spot | prod-shaped, 1 AZ-reduced | Multi-AZ, on-demand + managed node groups |
| RDS | single-AZ, small | Multi-AZ | Multi-AZ + cross-region read replica (eu-west-1) |
| Data | synthetic only | synthetic, weekly reseed | customer data (residency: af-south-1 primary per PROJECT_MEMORY §2.3) |
| Deploys | auto on merge to `main` | auto on release tag | manual approval + canary |
| Access | engineers (SSO, read-write) | engineers read, deploy via GitOps only | break-glass only; humans have no standing write access |

Parity rule: staging runs identical Helm charts and Terraform modules with different value files; only sizing and scale differ. Anything that can't be tested in staging is treated as untested.

## 2. GitOps with Argo CD

- One Argo CD instance per cluster (per account) — no cross-account cluster credentials.
- **App-of-apps:** `infra/helm/env/<env>/root-app.yaml` declares child Applications: `dlv-api`, `dlv-web`, `dlv-workers`, `dlv-platform` (ingress-nginx, cert-manager, external-secrets, Kyverno, Argo Rollouts, observability agents).
- Sync policy: `automated` with `prune: true`, `selfHeal: true` in all envs; prod additionally requires the manifest change to come from the release workflow (Kyverno verifies the gitops-bot signature and cosign image signatures/provenance before admission).
- Desired state = Git only. `kubectl` mutations in staging/prod are reverted by selfHeal and alert; there is no pipeline path that applies manifests directly (cicd-pipeline.md §1).
- Image flow: dev via Argo CD Image Updater tracking `sha-*` tags; staging/prod via digest-pinned value bumps committed by the release workflow.

## 3. Helm chart structure

```
infra/helm/
├── charts/
│   ├── dlv-service/          # library chart: deployment/rollout, service, HPA,
│   │   └── ...               # PDB, ServiceAccount (IRSA), NetworkPolicy, probes
│   ├── dlv-api/              # wraps dlv-service + migration pre-sync Job, ingress
│   ├── dlv-web/              # wraps dlv-service
│   ├── dlv-workers/          # wraps dlv-service (no ingress; queue-depth KEDA scaler)
│   └── dlv-platform/         # umbrella for cluster add-ons (pinned upstream charts)
└── env/
    ├── dev/values.yaml       # + root-app.yaml
    ├── staging/values.yaml
    └── prod/values.yaml
```

Conventions: kebab-case names; every workload sets resource requests/limits, `securityContext` (non-root, read-only rootfs, seccomp RuntimeDefault), topology spread across AZs, PDBs; secrets via External Secrets Operator → AWS Secrets Manager (no secret values in Git — PROJECT_MEMORY §7.7); config via ConfigMaps checksummed into pod annotations for automatic restarts.

## 4. Progressive delivery (Argo Rollouts)

`dlv-api` and `dlv-web` deploy as `Rollout` resources (canary strategy); `dlv-workers` uses rolling update with queue-drain preStop hooks.

**Canary steps (prod):**

| Step | Traffic | Hold | Gate |
|---|---|---|---|
| 1 | 5% | 10 min | AnalysisRun A |
| 2 | 25% | 10 min | AnalysisRun A |
| 3 | 50% | 15 min | AnalysisRun A + B |
| 4 | 100% | — | post-deploy checklist (§10) |

**AnalysisRun A (every step):** Prometheus/CloudWatch queries comparing canary vs stable —
- HTTP 5xx rate < 1% and < 2× stable
- p95 latency < 300 ms (API read budget) and < 1.5× stable
- pod restart count = 0

**AnalysisRun B (50% step):** business metrics —
- upload-pipeline success rate ≥ 99% over window
- auth success rate within 2% of stable
- queue depth not growing monotonically

**Rollback:** any failed AnalysisRun ⇒ automatic abort, traffic returns to stable within seconds, workflow reverts the Git manifest commit (keeping Git = cluster truth) and pages on-call. Manual abort available via `kubectl argo rollouts abort` (break-glass) or re-running the revert job. Staging uses the same Rollout with compressed holds (2 min) to keep the machinery exercised.

## 5. Database migration strategy

- **Engine:** Prisma Migrate; migrations run in a **pre-sync init Job** (Argo CD PreSync hook) executing `prisma migrate deploy` with a dedicated least-privilege DB role. App pods never run migrations.
- **Expand/contract, always:**
  1. *Expand* release: additive change only (new nullable column/table/index `CREATE INDEX CONCURRENTLY`, dual-write if renaming), code reads old shape, writes both.
  2. *Migrate* (background backfill via workers, throttled, resumable).
  3. *Contract* release (≥1 release later, after verification): remove old column/code path.
- **Never destructive in the same release as the code that depends on the change.** `DROP`/`ALTER ... TYPE`/`NOT NULL` tightening only in a contract release whose expand shipped previously; enforced by the PR-pipeline destructive-migration check + `migration:destructive-approved` label (cicd-pipeline.md §2).
- Because schema is always backward-compatible one release back, **canary and rollback never require down-migrations** — old and new pods run against the same schema.
- Long locks banned: statement timeout in the migration role, `CONCURRENTLY` indexes, batched backfills.
- Migration Job failure ⇒ sync halts before any pod update; alert; fix rolls forward.

## 6. Feature flags

- **Config-based initially** (no third-party service): flags defined in a typed `flags.ts` catalogue, values injected per environment via ConfigMap/Secrets; evaluated through a shared `FeatureFlags` port so a provider (e.g. self-hosted Flagsmith) can be introduced at Phase 7+ without call-site changes.
- Supported dimensions at launch: global on/off, per-environment, per-organisation allow-list.
- Rules: every incomplete feature merged to `main` sits behind a flag (trunk-based prerequisite — git-strategy.md §2); flags are short-lived (target < 90 days, tracked in a flag register with owner + removal issue); no flag may gate a security control (security invariants are never flaggable).
- Flag flips in staging/prod are Git changes (values file) ⇒ audited, reviewable, revertible.

## 7. Secret rotation deploys

- All secrets in AWS Secrets Manager (PROJECT_MEMORY §7.7) with rotation lambdas: DB credentials 30 days, internal API/webhook signing keys 90 days, JWT signing keys (RS256) 90 days with JWKS dual-publication overlap; KMS CMKs rotate annually + on demand (PROJECT_MEMORY §7.2).
- External Secrets Operator refreshes K8s secrets (1 min interval); the `secret-rotation` workflow (cicd-pipeline.md §7) triggers a rolling restart of consuming Deployments/Rollouts on rotation events so pods pick up new values within minutes — zero-downtime because every rotated credential supports dual validity (old+new) during overlap.
- Rotation is a **deploy-shaped event**: it shows in Argo CD history, is monitored, and a failed post-rotation health check auto-rolls back to the previous secret version.
- Emergency revocation runbook: mark secret version deprecated → force rotation → verify JWKS/consumer convergence → audit event.

## 8. Disaster recovery (summary)

Targets per PROJECT_MEMORY: **RPO 15 min, RTO 4 h.** Primary af-south-1, DR eu-west-1 (PROJECT_MEMORY §2.3). Full runbook: `docs/06-engineering/runbooks/dr-failover.md`.

- Data paths: RDS cross-region read replica (async, lag alarmed at 5 min); S3 CRR on all vault buckets (incl. Object-Lock replicas); Redis is rebuildable (sessions re-auth, queues drained-or-replayed from outbox); Secrets Manager + KMS multi-region replica keys; ECR replication.
- Failover (declared by incident commander): promote RDS replica → scale up pre-provisioned eu-west-1 EKS (warm-standby, pilot-light sizing) → Argo CD (DR instance) syncs `env/prod-dr` values → Route 53 failover records shift traffic → run E2E smoke → declare recovery. Data-residency note: SA customer data serves from DR only for the incident duration; return-to-primary procedure restores af-south-1 primacy and documents the residency exception (POPIA record).
- Quarterly drills validate RPO/RTO with timings recorded (testing-strategy.md §9).

## 9. Release cadence & freeze rules

- **Cadence:** dev — continuous (every merge); staging — every release tag, typically 2–3×/week; prod — up to daily, minimum weekly during active phases.
- **Freeze windows** (enforced via GitHub `prod` environment protection): Fridays after 12:00 SAST, weekends, SA public holidays, and declared business-critical windows. Hotfixes (git-strategy.md §7) are exempt with incident-commander approval.
- No prod deploys while a Sev-1/Sev-2 incident is open (other than its fix).
- Release notes auto-generated from the changelog (release-please) and posted to `#dlv-releases`.

## 10. Post-deploy verification checklist

Executed by the deploying engineer after canary reaches 100% (linked in the deploy run; items 1–5 automated, 6–10 human-confirmed):

1. Argo CD app Healthy/Synced; Rollout status Completed; no pod restarts in 15 min.
2. Synthetic monitors green: login, vault list, upload round-trip, timeline query, secure-link open.
3. Error budget dashboards: 5xx rate, p95 latency, queue depths at pre-deploy baseline ±10%.
4. Migration Job logs clean; no schema-drift alarm.
5. Security signals: WAF anomaly, GuardDuty, auth-failure rate — no new alerts.
6. Spot-check one signature-ceremony seal and one audit-event hash-chain verification in prod smoke tenant.
7. Feature flags for the release in intended positions (flag register updated).
8. Stripe webhook deliveries succeeding (billing releases only).
9. Release notes published; changelog tag matches deployed digest.
10. On-call handover note if behaviour/alert profile changed.

Any failed item: assess against rollback criteria (§4) — default to rollback if user-facing correctness or security is in doubt; roll forward only for cosmetic issues with an issue filed.
