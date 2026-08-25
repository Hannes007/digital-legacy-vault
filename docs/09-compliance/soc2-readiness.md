# SOC 2 Readiness — Trust Services Criteria Control Mapping

**Purpose (Phase 9):** map the DLV control environment to the SOC 2 Trust
Services Criteria (TSC 2017, rev. 2022) so the observation window can start.
SOC 2 Type II is a target, not a launch blocker (PROJECT_MEMORY §2.1). Scope:
the Security (Common Criteria) category plus Availability and Confidentiality.

**How to read this:** each control names the implementing mechanism already in
the codebase/infra and where the auditor's **evidence** is produced. "Automated"
means evidence is emitted continuously (audit log, CI artefact, IaC state)
rather than assembled by hand.

## Common Criteria — CC1 Control Environment
| Ctrl | Requirement | Implementation | Evidence |
|---|---|---|---|
| CC1.1 | Integrity & ethics | Code review + Conventional Commits + CODEOWNERS | Git history, PR reviews |
| CC1.2 | Board oversight | Risk register with owners (`docs/04-security/risk-register.md`) | Risk register, review minutes |
| CC1.4 | Competence | Squad ownership in the mitigation backlog (threat-model §6) | Org chart, backlog |

## CC2 Communication & Information
| CC2.1 | Quality information | Structured audit events (hash-chained) | `audit_events` export |
| CC2.2 | Internal comms | Runbooks (`docs/06-engineering/runbooks/`), on-call | Runbook set |
| CC2.3 | External comms | RFC 9116 `security.txt`, status page, DPA | `/.well-known/security.txt` |

## CC3 Risk Assessment
| CC3.1 | Objectives | SRS/PRD acceptance criteria | `docs/01-requirements/` |
| CC3.2 | Risk identification | STRIDE threat model + 5×5 risk register | `threat-model.md`, `risk-register.md` |
| CC3.4 | Change risk | Expand/contract migration gate, destructive-migration label | CI logs, `deployment-strategy.md` |

## CC4 Monitoring
| CC4.1 | Ongoing evaluation | CloudWatch, GuardDuty, Security Hub, Inspector | Cloud dashboards |
| CC4.2 | Deficiency comms | Incident management runbook + PagerDuty | Incident tickets |

## CC5 Control Activities
| CC5.1 | Control selection | Security-coding rules, CI gates | `coding-standards.md §10`, CI |
| CC5.2 | Technology controls | See CC6–CC8 | — |

## CC6 Logical & Physical Access
| Ctrl | Requirement | Implementation | Evidence |
|---|---|---|---|
| CC6.1 | Logical access | OIDC auth: Argon2id, JWT RS256 (15 min), rotating refresh w/ reuse-detection, TOTP, WebAuthn passkeys, enterprise SSO (JIT) | `identity` module, session table |
| CC6.1 | Encryption | TLS 1.3 in transit; AES-256-GCM envelope at rest (per-doc DEK, KMS-wrapped); field-level PII cipher; **Client-Encrypted Vault** (zero-knowledge) | `@dlv/crypto`, KMS, `crypto` tests |
| CC6.2 | Registration/auth | Email verification, no-enumeration login, JIT SSO provisioning | `identity` module |
| CC6.3 | Least privilege | RBAC (CASL) + ABAC (vault-relationship, deny-by-default); scoped partner API keys | `authorization`, `RelationshipAccessService`, `ApiKeyGuard` |
| CC6.6 | Boundary protection | Helmet CSP/HSTS, strict CORS allow-list, body-size cap, WAF/Shield, NetworkPolicies | `security-headers.ts`, Helm, Terraform |
| CC6.7 | Data-in-transit restriction | HTTPS-only webhooks, HMAC-signed deliveries | `integration` module |
| CC6.8 | Malware prevention | ClamAV quarantine pipeline + magic-byte validation | `vault` promotion pipeline, abuse tests |

## CC7 System Operations
| CC7.1 | Vulnerability detection | CodeQL SAST, gitleaks, osv-scanner, hadolint, Inspector | CI workflow artefacts |
| CC7.2 | Monitoring/anomalies | Audit hash-chain, rate limiting, GuardDuty | `audit_events`, throttler |
| CC7.3 | Incident evaluation | Incident runbook, severity matrix | Incident records |
| CC7.4 | Incident response | On-call, DR failover runbook | `runbooks/`, drill log |
| CC7.5 | Recovery | DR drill (RPO 15m/RTO 4h), backups, Object Lock WORM | `dr-drill-log.md`, `dr-drill-check.mjs` |

## CC8 Change Management
| CC8.1 | Change control | Trunk-based, PR gates (lint/typecheck/test/build/SAST/secret/audit), GitOps (Argo CD), IaC (Terraform) | CI, Argo, Terraform state |

## CC9 Risk Mitigation
| CC9.1 | Business disruption | DR programme, warm standby | DR runbook + drill log |
| CC9.2 | Vendor management | Sub-processor list, DPAs, AI zero-retention attestation (M-06) | `data-processing.md` |

## Availability (A)
| A1.1 | Capacity | HPA, load tests at 5× launch traffic | Perf reports |
| A1.2 | Environmental/backup/recovery | Multi-AZ RDS, S3 versioning + CRR, DR drill | Terraform, drill log |
| A1.3 | Recovery testing | Quarterly DR drills | `dr-drill-log.md` |

## Confidentiality (C)
| C1.1 | Confidential info identified | Data classification, PII field-encryption flags | `erd.md`, schema `@map` cipher fields |
| C1.2 | Confidential info disposed | Crypto-erasure DSR, retention policy, trash TTL | `data-subject` module, `retention.ts` |

## Observation window plan
1. Freeze scope at Phase 9 start (feature-complete through Phase 8). ✔
2. Confirm every control above emits evidence; wire the automated ones to a
   central evidence store (audit export, CI artefacts, IaC state snapshots).
3. Start the **6-month Type II observation window**; sample evidence monthly.
4. Engage the external auditor; remediate observations before the Type II report.
5. ISO 27001 alignment review runs in parallel (Annex A ↔ CC mapping).

## Policy set index (required for the audit)
Information Security Policy · Access Control · Cryptography · SDLC & Change
Management · Incident Response · Business Continuity/DR · Vendor/Sub-processor
Management · Data Retention & Disposal · Acceptable Use · Risk Management.
Tracked in `docs/09-compliance/policy-index.md`.
