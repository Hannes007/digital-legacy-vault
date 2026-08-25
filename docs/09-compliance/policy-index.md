# Policy Set Index (SOC 2 / ISO 27001)

Status of the policy documents an auditor expects. Each maps to the controls in
`soc2-readiness.md` and, where a technical control exists, to the code/infra
that enforces it.

| # | Policy | Enforcing control(s) | Status |
|---|---|---|---|
| P-01 | Information Security Policy | Whole control set | Draft |
| P-02 | Access Control Policy | RBAC/ABAC, MFA, SSO, least-privilege keys | Draft |
| P-03 | Cryptography Policy | Envelope encryption, TLS 1.3, KMS rotation | Draft |
| P-04 | SDLC & Change Management | Trunk-based, CI gates, GitOps | Draft |
| P-05 | Incident Response Plan | Incident runbook, on-call, severity matrix | Draft |
| P-06 | Business Continuity & DR | DR failover runbook, quarterly drills | Draft |
| P-07 | Vendor / Sub-processor Management | DPAs, zero-retention attestations | Draft |
| P-08 | Data Retention & Disposal | Retention policy, crypto-erasure DSR | Draft |
| P-09 | Acceptable Use | Onboarding attestation | Draft |
| P-10 | Risk Management | Risk register, threat model, review cadence | Draft |

"Draft" = authored and under review; promoted to "Approved" once signed by the
control owner. The observation window can begin with approved policies in place.
