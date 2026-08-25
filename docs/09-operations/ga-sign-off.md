# GA Launch Sign-Off (v1.0.0)

The final gate before public availability (Phase 10 exit: *GA checklist signed
by engineering, design, security, legal*). This builds on — and does not repeat
— the Phase 9 go/no-go (`docs/09-compliance/ga-go-no-go-checklist.md`); it
confirms launch-execution readiness and captures the four sign-offs.

## Launch-execution readiness
- [ ] Phase 9 go/no-go passed and dated.
- [ ] Prod scaled for 5× projected launch traffic; cost guardrails/alarms armed.
- [ ] Marketing site + onboarding polish live; help centre published.
- [ ] Support processes ready: SUPPORT_AGENT tooling, SLAs, escalation paths.
- [ ] Beta-feedback punch list triaged; no launch-blocking items open.
- [ ] Pricing/plan final configuration loaded (Stripe live mode verified).
- [ ] Launch comms drafted and scheduled; status page operational.
- [ ] GA launch runbook rehearsed incl. rollback (`ga-launch-runbook.md`).
- [ ] SLO dashboards + burn-rate alerts live (`slo-monitoring-plan.md`).
- [ ] On-call rotation staffed 24×7 for the 2-week watch.

## Release
- [ ] `v1.0.0` tag created on `main` (annotated, SemVer) via release-please.
- [ ] `CHANGELOG.md` aggregated and reviewed.
- [ ] Release notes published (`release-notes-v1.0.0.md`).
- [ ] Image built, signed, and promoted to prod ECR; Argo pinned to the tag.

## Sign-off
| Function | Name | Decision | Date |
|---|---|---|---|
| Engineering | | Go / No-Go | |
| Design | | Go / No-Go | |
| Security | | Go / No-Go | |
| Legal | | Go / No-Go | |
| Launch Commander (chair) | | Proceed / Hold | |

## Post-launch → Live
After the 14-day stabilisation watch with all SLOs met and every error budget
≥ 50% remaining (`slo-watch-check.mjs`), the launch commander flips
PROJECT_MEMORY §9 launch status to **Live** and closes the GA phase.
