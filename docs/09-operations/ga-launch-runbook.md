# Runbook — GA Launch (Phase 10)

Public availability in South Africa with an EU-ready posture. Executed only
after the Phase 9 go/no-go passes (`docs/09-compliance/ga-go-no-go-checklist.md`).
Launch is a deliberate, staged cutover with a fast rollback path — the canary
machinery (deployment-strategy §canary) is reused, not replaced.

## Roles
- **Launch commander** (eng lead) — owns the sequence and the go/hold calls.
- **On-call SRE** — watches SLO dashboards, holds the rollback trigger.
- **Security, Design, Legal** — on standby for their sign-off items.
- **Support lead** — help-centre + SUPPORT_AGENT tooling ready, SLAs live.

## T-minus (pre-launch, day before)
1. Confirm the GA sign-off checklist is fully **Go** (`ga-sign-off.md`).
2. Freeze deploys except the launch train (environment protection, 2 approvers).
3. Verify prod scale-up + cost guardrails: HPA min replicas raised for launch,
   budget alarms armed, RDS/Redis sized for 5× projected traffic.
4. Confirm backups + S3 Object Lock, DR replica healthy (`dr-drill-check.mjs preflight`).
5. Pre-warm caches/CDN; validate TLS certs + `security.txt` reachable.
6. Final plan/pricing configuration loaded (Stripe live keys, plan catalogue).
7. Tag the release `v1.0.0` (release-please) — see `ga-sign-off.md` §release.

## Cutover sequence (launch day)
1. **Announce start.** Launch commander opens the war-room channel; records T0.
2. **Deploy `v1.0.0` to prod** via the canary Rollout (10% → 25% → 50% → 100%),
   each step gated on the AnalysisRun (5xx rate, p95 latency, error budget).
3. **Smoke test** at each canary step: journeys 2, 6, 7 (login→upload→READY,
   sign→seal→verify, billing entitlements) against prod.
4. **Open the gate.** Flip Route 53 / marketing site to public availability;
   remove the closed-beta allow-list.
5. **Watch 60 min** at full traffic before declaring launch stable.
6. **Announce GA.** Launch comms go out; status page → operational.

## Feature-flag plan
Launch-risky paths ship behind flags, defaulted **off**, enabled after the
60-minute stable window: AI features (per-plan), WhatsApp notifications,
partner API general availability. Flags allow disable-without-deploy if an SLO
degrades.

## Rollback triggers (any one → roll back)
- 5xx rate > 2% sustained 5 min, or p95 API latency > 2× baseline for 10 min.
- Error budget burn > 10% in the first hour.
- Auth, upload-pipeline, or billing-webhook failure spike.
- Any Sev-1 security finding.

## Rollback procedure (target < 5 min)
1. On-call triggers `kubectl argo rollouts abort` (or re-runs the revert job) —
   traffic returns to the previous stable revision within seconds.
2. Revert the GitOps manifest commit (Git stays cluster truth); Argo re-syncs.
3. Re-close the beta allow-list if the public gate was opened.
4. Page the launch commander; open an incident; snapshot dashboards for RCA.
5. Post-mortem before the next attempt; no same-day re-launch without sign-off.

## Post-launch
Enter the **2-week stabilisation watch** (`slo-monitoring-plan.md`): SLOs must
hold and error budget stay ≥ 50% remaining. On success, flip PROJECT_MEMORY
launch status to **Live** (`slo-watch-check.mjs` produces the evidence row).
