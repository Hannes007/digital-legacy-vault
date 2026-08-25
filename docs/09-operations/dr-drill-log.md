# DR Drill Log

Quarterly disaster-recovery drills validating RPO 15 min / RTO 4 h
(PROJECT_MEMORY §9). Each row is produced by `scripts/dr-drill-check.mjs` and
signed off by the incident commander. See the runbook:
`docs/06-engineering/runbooks/dr-failover.md`.

| Drill date | Type | Measured RPO | Measured RTO | Smoke | Residency record | Result | IC |
|---|---|---|---|---|---|---|---|
| _pending first live drill_ | | | | | | | |

## Acceptance criteria (Phase 9 exit)

- Measured RPO ≤ 15 minutes.
- Measured RTO ≤ 4 hours.
- All E2E smoke journeys green against the DR environment.
- POPIA data-residency exception recorded for the failover window.
