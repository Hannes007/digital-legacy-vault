# Runbook — Disaster Recovery Failover (af-south-1 → eu-west-1)

**Targets:** RPO 15 min · RTO 4 h (PROJECT_MEMORY §9). Primary `af-south-1`,
warm-standby DR `eu-west-1` (PROJECT_MEMORY §2.3). This runbook is exercised in
the quarterly DR drill (Phase 9 exit criterion: *DR drill within targets*).

## 0. When to invoke

Declared by the **incident commander** when af-south-1 is unrecoverable within
the RTO, or on a scheduled drill. Failover is a deliberate, human-declared
action — never automatic — because it carries a POPIA data-residency exception
(SA data served from eu-west-1 for the incident's duration).

## 1. Pre-flight (continuous — verified by the drill script)

| Data path | Mechanism | Alarm |
|---|---|---|
| RDS Postgres | Cross-region read replica (async) | Replica lag > 5 min |
| S3 vault buckets | Cross-region replication incl. Object-Lock replicas | Replication latency > 15 min |
| Secrets / KMS | Multi-region replica keys | Key replica health |
| Container images | ECR replication to eu-west-1 | Image-present check |
| Compute | eu-west-1 EKS pilot-light (warm) | Node group ready |

Redis is **rebuildable** (sessions re-auth; queues drained or replayed from the
outbox), so it is not on the RPO-critical path.

## 2. Failover sequence (target ≤ 4 h)

1. **Declare.** Incident commander opens an incident, records the start
   timestamp (RTO clock), and notifies stakeholders.
2. **Freeze primary writes** if af-south-1 is partially reachable (set the API
   to read-only via the dunning/read-only flag path) to bound RPO.
3. **Promote RDS replica** in eu-west-1 to primary; capture the promotion
   timestamp and the last-replicated LSN (RPO evidence).
4. **Scale up eu-west-1 EKS** from pilot-light to production sizing.
5. **Point GitOps at DR.** Argo CD (DR instance) syncs `env/prod-dr` values;
   the migrate PreSync hook is a no-op (schema already replicated).
6. **Shift traffic.** Route 53 failover records move to the eu-west-1 ALB;
   confirm DNS + certificate validity.
7. **Smoke test.** Run the E2E smoke journeys (login, upload→READY, sign,
   billing entitlements) against the DR base URL.
8. **Declare recovery.** Record the end timestamp; compute RTO = end − declare.

## 3. Return to primary (after af-south-1 is restored)

Re-establish replication in reverse, schedule a maintenance window, fail back,
restore af-south-1 primacy, and **file the POPIA residency-exception record**
noting the window during which SA data served from eu-west-1.

## 4. Drill acceptance

The drill passes when: measured RPO ≤ 15 min (from step 3 evidence), measured
RTO ≤ 4 h (step 8), all smoke journeys green, and the residency exception is
recorded. Timings are appended to the DR drill log
(`docs/09-operations/dr-drill-log.md`) and to testing-strategy §9.

Run `scripts/dr-drill-check.mjs` before and after to validate the replication
pre-conditions and to compute/record the RPO/RTO measurements.
