# Risk Register — Digital Legacy Vault (DLV)

| Document control | |
|---|---|
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Security Team |
| Classification | Internal — Confidential |
| Related documents | `PROJECT_MEMORY.md`, `docs/04-security/security-architecture.md` (SA-§), `docs/04-security/threat-model.md` (T-xxx / AC-xx / M-xx) |

**Scoring:** Likelihood (L) 1–5 (1 = rare, 2 = unlikely, 3 = possible, 4 = likely, 5 = almost certain) × Impact (I) 1–5 (1 = negligible, 2 = minor, 3 = moderate, 4 = major, 5 = severe/existential). Score = L × I. Bands: **Low 1–4**, **Medium 5–9**, **High 10–14**, **Critical 15–25**. Inherent = before controls; Residual = with controls in `security-architecture.md` v1.0.0 operating.

**Owner roles** are canonical PROJECT_MEMORY platform roles or named Stellr SA company functions (CISO, CTO, Information Officer, Head of Legal, Head of Product, Head of Engineering, Head of Support, CFO, CEO).

---

## 1. Register (35 risks)

### Security risks

| ID | Risk | Description | Cat | L | I | Inh. | Key mitigations (refs) | L | I | Res. | Owner | Review |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-001 | Account takeover of vault owners | Credential stuffing/phishing leads to full vault exposure incl. wills and IDs | Security | 4 | 5 | 20 | Passkeys, TOTP, Argon2id + HIBP screening, lockout backoff, risk-based step-up, refresh reuse detection (SA-§2, §7.2; T-001/T-002; M-01) | 2 | 4 | 8 | CISO | Quarterly |
| R-002 | Crypto-recovery document theft | `CRYPTO_RECOVERY` content stolen and drained — irreversible financial loss, existential reputational harm | Security | 3 | 5 | 15 | Client-Encrypted tier steering (M-13), never in default emergency scope, step-up downloads, envelope encryption (AC-05; SA-§3.3) | 2 | 5 | 10 | CISO | Quarterly |
| R-003 | Fraudulent emergency access (fake death claim) | Forged death certificate + compromised/complicit executor obtains a living owner's vault | Security | 3 | 5 | 15 | Quorum + 7-day delay + all-channel veto, dual human evidence review, pre-registered relationships (SA-§11; T-060; AC-01; M-09) | 2 | 4 | 8 | CISO | Quarterly |
| R-004 | Malicious insider reads vault content | Engineer/DBA/support attempts to access wills, directives, IDs | Security | 3 | 5 | 15 | Per-tenant CMK + encryption context, tokenisation, no back-office content path, audit chain, IRSA least privilege, dual control (T-062/T-021; AC-04) | 1 | 5 | 5 | CISO | Quarterly |
| R-005 | Audit log tampering | Attacker or insider hides access by altering `AuditEvent`s, destroying legal-evidence value | Security | 2 | 5 | 10 | INSERT-only grants, hash chain, hourly Object Lock export, signed segment roots, nightly verifier (SA-§5; T-022) | 1 | 4 | 4 | CISO | Semi-annual |
| R-006 | Death-verification gap pre-integration | Manual review of death evidence errs (false grant, or wrongful prolonged denial) until Home Affairs integration lands | Security | 3 | 4 | 12 | Dual review, quorum, mandatory delay, owner veto; M-09 integration target launch +90 d; false-negative-preferred policy | 2 | 4 | 8 | Head of Product | Monthly until M-09 |
| R-007 | Malware distribution via vault | Infected/polyglot upload later opened by executor, hospital staff, or lawyer | Security | 4 | 3 | 12 | Quarantine → ClamAV → magic-byte allow-list → SHA-256 → promote, fail closed, attachment-only cookie-less downloads (SA-§4; T-030; M-04) | 2 | 3 | 6 | Head of Engineering | Quarterly |
| R-008 | Supply-chain compromise (npm/image) | Malicious dependency or CI compromise exfiltrates keys/content | Security | 3 | 5 | 15 | Lockfiles, Snyk/Trivy gates, SBOM, Cosign + Kyverno digest pinning, GitHub OIDC, egress allow-list (T-050/T-051; M-08) | 2 | 4 | 8 | CTO | Quarterly |
| R-009 | Professional-role credential theft | Stolen DOCTOR/HOSPITAL_ADMIN/LAWYER accounts harvest directives/estate data | Security | 3 | 4 | 12 | Patient/client-relationship ABAC, category-scoped grants, short sessions, risk scoring; hardware passkey mandate (T-063; AC-03; M-10) | 2 | 3 | 6 | CISO | Quarterly |
| R-010 | KMS/key-hierarchy compromise | CMK misuse or over-broad key policy unwraps DEKs across a tenant | Security | 2 | 5 | 10 | Per-tenant CMKs, encryption-context binding, key-policy least privilege, CloudTrail on all KMS calls, rotation (SA-§3.2; T-032) | 1 | 5 | 5 | CISO | Semi-annual |
| R-011 | SSRF / cloud-metadata pivot | URL-fetch/webhook feature abused to reach IMDS or internal services | Security | 3 | 4 | 12 | Egress allow-list proxy, rebinding-safe validation, IMDSv2 hop-limit 1, VPC endpoints (SA-§6.1-A10; T-040) | 1 | 4 | 4 | Head of Engineering | Semi-annual |
| R-012 | Cross-tenant authorization defect (IDOR/BOLA) | Policy gap lets one tenant read another's documents | Security | 3 | 5 | 15 | Deny-by-default CASL, policy-coverage CI gate, 15-role authz matrix (T-010/T-011; M-02), external pen test pre-launch | 1 | 5 | 5 | Head of Engineering | Per release |
| R-013 | Notification-channel phishing | Spoofed DLV emergency notices phish owners during the veto window | Security | 3 | 4 | 12 | DMARC p=reject, in-app-only veto confirmation, no credential-entry links, branded WhatsApp sender (T-043; M-07) | 2 | 3 | 6 | CISO | Semi-annual |
| R-014 | DDoS during time-critical access | L7 flood degrades hospital directive lookup or estate flows | Security | 3 | 4 | 12 | Shield, WAF Bot Control, CloudFront absorb, rate tiers, queue backpressure, Multi-AZ (T-004) | 2 | 3 | 6 | Head of Engineering | Semi-annual |

### Compliance / legal risks

| ID | Risk | Description | Cat | L | I | Inh. | Key mitigations (refs) | L | I | Res. | Owner | Review |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-015 | SA Wills Act validity misunderstanding | Users believe a DLV-stored/e-signed will is legally executed; Wills Act 7 of 1953 requires wet-ink signature with witnesses — estate disputes and liability claims follow | Legal | 4 | 5 | 20 | Product positioned as repository/drafting/evidence layer only (PROJECT_MEMORY §2.2); prominent UI disclaimers + `Consent` acknowledgement at will upload; wet-ink execution checklists; legal review of all copy (C-12) | 2 | 4 | 8 | Head of Legal | Quarterly |
| R-016 | POPIA §72 cross-border transfer | CRR to eu-west-1 and third-party processors (Twilio, Stripe, Anthropic) constitute cross-border transfers requiring lawful basis/safeguards | Legal | 3 | 4 | 12 | Data-residency pinning to af-south-1 primary, documented §72 safeguards + DPAs with processors, transfer register, consent/notice language (SA-§9; C-03) | 2 | 3 | 6 | Information Officer | Semi-annual |
| R-017 | POPIA §22 breach-notification failure | Late or inadequate notification to the Information Regulator / data subjects after an incident ("as soon as reasonably possible" standard missed) | Legal | 2 | 4 | 8 | IR runbook with 72 h internal decision SLA, templated notification pack, breach register, tabletop exercises (SA-§10.4) | 1 | 4 | 4 | Information Officer | Semi-annual |
| R-018 | ECTA signature enforceability challenge | A signed directive/mandate is disputed; DLV's built-in ceremony fails to qualify as an advanced electronic signature or the evidence bundle is found insufficient | Legal | 3 | 4 | 12 | SHA-256 digest + RFC 3161 trusted timestamp + signer identity & device evidence bundle, Object Lock storage, legal opinion on AES qualification and accreditation pathway (C-11); scope limited to directives/mandates/consents, never will execution | 2 | 3 | 6 | Head of Legal | Semi-annual |
| R-019 | Erasure vs. retention conflict | POPIA/GDPR erasure requests collide with Object Lock, `LegalHold`, or estate-evidence duties | Legal | 3 | 3 | 9 | Crypto-shredding for locked objects, hold-check in deletion workflow, documented retention schedule, deletion decisions audited (SA-§9; AC-07) | 2 | 2 | 4 | Information Officer | Semi-annual |
| R-020 | Special-personal-information handling (health data) | `MEDICAL_RECORD`/directive processing triggers POPIA §§26–27 obligations (and HIPAA-adjacent expectations) without adequate basis | Legal | 3 | 4 | 12 | Explicit consent capture (`Consent` entity), field-level encryption, HIPAA-ready safeguard mapping, BAAs only if US healthcare onboards (C-10) | 2 | 3 | 6 | Information Officer | Semi-annual |
| R-021 | Lawful-access / regulator overreach | Compelled disclosure demands exceed lawful scope; mishandling harms users and reputation | Legal | 2 | 4 | 8 | Dual-control detokenisation, law-enforcement request policy, outside counsel review, transparency-report commitment; Client-Encrypted tier technically limits what can be produced | 1 | 3 | 3 | Head of Legal | Annual |
| R-022 | SOC 2 target slippage harming B2B sales | Enterprise deals stall awaiting SOC 2 Type II (a certification target, not a launch blocker per PROJECT_MEMORY §2.1) | Compliance | 4 | 3 | 12 | ISO 27001-aligned control set from day one, evidence automation (C-05/C-09), readiness tracker, bridge letters + pen-test reports for prospects | 3 | 2 | 6 | CISO | Quarterly |

### Operational risks

| ID | Risk | Description | Cat | L | I | Inh. | Key mitigations (refs) | L | I | Res. | Owner | Review |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-023 | Support social engineering | Grieving-relative pressure or pretexting extracts account changes from support staff | Operational | 4 | 4 | 16 | Support tooling technically cannot unlock vaults, scripted refusal + legitimate-flow guidance, SE drills, all support actions audited (AC-06) | 2 | 3 | 6 | Head of Support | Quarterly |
| R-024 | af-south-1 regional outage | Primary-region failure interrupts service; DR failover to eu-west-1 raises residency questions mid-incident | Operational | 2 | 4 | 8 | Multi-AZ, CRR + cross-region snapshots, tested DR runbook (RTO 4 h / RPO 15 min assumed targets), residency-aware failover comms plan | 2 | 3 | 6 | CTO | Semi-annual + annual DR test |
| R-025 | Backup restore failure | Backups exist but restores fail or are incomplete when needed | Operational | 3 | 4 | 12 | Quarterly restore tests with timing evidence, isolated backup account, PITR 35 d, restore runbooks | 2 | 3 | 6 | Head of Engineering | Quarterly |
| R-026 | Key-person dependency in security operations | Small SecOps bench: single reviewer for emergency-access evidence, alert fatigue, on-call gaps | Operational | 4 | 3 | 12 | Dual-review roster, on-call rota, runbook automation, managed-detection option assessed, cross-training plan | 3 | 2 | 6 | CISO | Quarterly |
| R-027 | Notification delivery failure in emergency window | SES/Twilio outage or stale contact data means the owner never sees veto notices during the delay window | Operational | 3 | 4 | 12 | Multi-channel fan-out (e-mail, SMS, WhatsApp, push), delivery receipts, delay-clock pause on all-channel failure for death claims, annual contact-verification nudges (T-044) | 2 | 3 | 6 | Head of Engineering | Semi-annual |
| R-028 | Secrets sprawl / rotation lapse | Third-party keys (Stripe, Twilio, Anthropic) leak via logs or ex-staff retain access | Operational | 3 | 4 | 12 | Secrets Manager only (invariant §7.7), 90-d + departure-triggered rotation, gitleaks in CI, log-scrubbing filters (SA-§8.3) | 2 | 3 | 6 | Head of Engineering | Quarterly |
| R-029 | Trustee/Shamir share loss | Client-Encrypted Vault owners lose passphrase and a threshold of trustees is unreachable — permanent, by-design data loss blamed on DLV | Operational | 4 | 3 | 12 | Enrolment warnings + `Consent` record, share-health reminders, trustee re-key ceremony on changes, guidance toward 3-of-5 (SA-§3.6) | 3 | 2 | 6 | Head of Product | Semi-annual |

### Technical risks

| ID | Risk | Description | Cat | L | I | Inh. | Key mitigations (refs) | L | I | Res. | Owner | Review |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-030 | Crypto implementation defect | Bug in envelope/field/client-side crypto (IV reuse, AAD omission, weak KDF params) silently weakens confidentiality | Technical | 2 | 5 | 10 | AWS Encryption SDK / WebCrypto / libsodium only, no bespoke primitives, crypto-change review gate, external crypto review pre-launch, test vectors in CI (SA-§3) | 1 | 4 | 4 | Head of Engineering | Per release touching crypto |
| R-031 | af-south-1 service parity gaps | Required AWS features (e.g. Textract) unavailable or late in Cape Town region force workarounds | Technical | 4 | 2 | 8 | Known fallback: self-hosted Tesseract worker (PROJECT_MEMORY §2.8); region-parity check in architecture reviews; eu-west-1 burst path for non-residency-sensitive workloads only | 3 | 2 | 6 | CTO | Quarterly |
| R-032 | AI-provider data handling | Claude/Textract processing exceeds minimum-necessary or retention terms change adversely | Technical | 2 | 4 | 8 | AiGateway enforces tier rules (Client-Encrypted content never sent, PROJECT_MEMORY §2.8), zero-retention terms on file, annual re-verification (T-042; M-06) | 1 | 3 | 3 | CTO | Annual |
| R-033 | Schema/migration data-integrity incident | Prisma migration corrupts or orphans document metadata (wrapped DEKs, hashes, chain pointers) | Technical | 2 | 4 | 8 | Migration review gate, staging soak with prod-shaped data, pre-migration snapshots + PITR, DEK-integrity verifier job | 1 | 4 | 4 | Head of Engineering | Per release |

### Business risks

| ID | Risk | Description | Cat | L | I | Inh. | Key mitigations (refs) | L | I | Res. | Owner | Review |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-034 | Trust collapse after publicised incident | Any confirmed breach of wills/ID/crypto data destroys the core value proposition ("the safe got cracked") | Business | 2 | 5 | 10 | Entire control set; pre-drafted incident comms plan, transparency posture, cyber insurance (assumed procured pre-launch), Client-Encrypted tier as trust anchor | 1 | 5 | 5 | CEO (advised by CISO) | Quarterly |
| R-035 | Third-party dependency concentration | Stripe/Twilio/Anthropic/AWS term changes or outages materially disrupt billing, notifications, AI, or hosting | Business | 3 | 3 | 9 | Provider-abstraction layers (AiGateway; notification adapter), reserved DocuSign integration point, exit/portability plans, contract review calendar | 2 | 3 | 6 | CFO | Annual |

---

## 2. 5×5 residual-risk matrix summary

All 35 risks plotted by **residual** Likelihood × Impact:

| Impact ↓ \ Likelihood → | 1 — Rare | 2 — Unlikely | 3 — Possible | 4 — Likely | 5 — Almost certain |
|---|---|---|---|---|---|
| **5 — Severe** | R-004, R-010, R-012, R-034 | R-002 | — | — | — |
| **4 — Major** | R-005, R-011, R-017, R-030, R-033 | R-001, R-003, R-006, R-008, R-015 | — | — | — |
| **3 — Moderate** | R-021, R-032 | R-007, R-009, R-013, R-014, R-016, R-018, R-020, R-023, R-024, R-025, R-027, R-028, R-035 | — | — | — |
| **2 — Minor** | — | R-019 | R-022, R-026, R-029, R-031 | — | — |
| **1 — Negligible** | — | — | — | — | — |

**Band totals (residual):** Critical (15–25): **0** · High (10–14): **1** (R-002) · Medium (5–9): **26** · Low (1–4): **8**.

**Top residual risks requiring active management:** R-002 (crypto-recovery theft — gated on M-13 Client-Encrypted-by-default), then the residual-8 cluster R-001 / R-003 / R-006 / R-008 / R-015 (gated on M-01, M-09, M-08 and permanent Wills Act product positioning respectively).

---

## 3. Risk acceptance criteria

| Residual band | Decision rule |
|---|---|
| **Low (1–4)** | Accepted by the risk owner; recorded here; re-reviewed at the stated cadence. |
| **Medium (5–9)** | Acceptable **only with** a named owner, active mitigations, and a stated review cadence (all present above). CISO sign-off recorded in the register changelog. |
| **High (10–14)** | Not acceptable as steady state. Requires a funded, dated mitigation plan (threat-model M-ref) driving to Medium within 90 days, plus joint CISO + CTO sign-off for the interim period. Currently applies to R-002 only (plan: M-13, launch gate). |
| **Critical (15–25)** | Never accepted. Launch/feature blocker: the exposing capability ships disabled or gated until residual ≤ High-with-plan. |
| **Absolute constraints** | No risk treatment may violate a PROJECT_MEMORY §7 security invariant. No acceptance decision may waive POPIA §22 / GDPR Art. 33–34 notification duties. Risks touching `estate` emergency access always prefer false-negative (delayed legitimate access) over false-positive (wrongful grant). |

**Process:** full register review quarterly by the Security Team; individual entries at their stated cadence; any P1/P2 incident, new pen-test finding, or threat-model refresh triggers an out-of-cycle review of affected entries. Changes are version-controlled with this document (Conventional Commits, per PROJECT_MEMORY §8).

---

## 4. Assumptions

1. RTO 4 h / RPO 15 min (R-024) and cyber-insurance procurement (R-034) are working assumptions pending executive confirmation; neither is fixed in PROJECT_MEMORY.
2. Owner functions beyond PROJECT_MEMORY's canonical platform roles (CISO, CTO, Information Officer, Head of Legal/Product/Engineering/Support, CFO, CEO) are Stellr SA organisational functions assumed to exist at launch.
3. Residual scores assume `security-architecture.md` v1.0.0 controls are fully implemented and threat-model backlog items (M-01…M-13) retain their stated target dates.
