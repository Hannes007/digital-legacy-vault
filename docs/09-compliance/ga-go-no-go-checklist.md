# GA Go / No-Go Review Checklist

**Phase 9 exit criterion:** *go/no-go review passed.* Chaired by the incident
commander with engineering, design, security and legal sign-off. Every item is
**Go** (or an accepted, documented risk) before GA (Phase 10).

## Security
- [ ] External pentest complete; **zero open critical/high** findings (`pentest-scope.md`).
- [ ] Authz matrix (M-02) green in CI; deny-by-default verified.
- [ ] SAST (CodeQL), secret scan (gitleaks), dependency scan (osv-scanner) green.
- [ ] Security headers/CSP, CORS allow-list, HSTS enabled in prod.
- [ ] Launch-gate mitigations landed: M-02, M-13 (crypto-recovery client-encrypt-by-default).
- [ ] `security.txt` published; disclosure/bug-bounty channel live.

## Reliability & DR
- [ ] DR drill within targets: **RPO ≤ 15 min, RTO ≤ 4 h** (`dr-drill-log.md`).
- [ ] Load test at **5× projected launch traffic** passed; SLOs defined with error budgets.
- [ ] On-call rotation, incident runbooks, and status page live.
- [ ] Backups + S3 Object Lock (WORM) verified; restore tested.

## Compliance
- [ ] SOC 2 observation window **started**; evidence automation confirmed.
- [ ] POPIA operator / GDPR processor docs complete; sub-processor DPAs signed.
- [ ] ECTA signature legal opinion + SA Wills Act wet-ink caveat on file.
- [ ] Data-subject export/erasure round-trip tested against a real Object-Lock bucket.
- [ ] Retention/disposal policy active (7y signed/audit, 30d trash, 14d cooling-off).

## Accessibility & UX
- [ ] WCAG 2.2 AA audit passed; automated axe pass clean (`accessibility-audit.md`).
- [ ] Review items 2.4.11 and 3.3.7 closed.

## Product & operations
- [ ] E2E journeys 2–8 green against staging.
- [ ] Billing (Stripe) dunning/proration verified with test clocks.
- [ ] Partner API contract published; versioning policy in effect.
- [ ] Rollback plan rehearsed; feature flags for launch-risky paths.

## Decision
| Role | Name | Go / No-Go | Date |
|---|---|---|---|
| Engineering | | | |
| Design | | | |
| Security | | | |
| Legal | | | |
| Incident Commander (chair) | | | |
