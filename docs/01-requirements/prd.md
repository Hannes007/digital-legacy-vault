# Product Requirements Document (PRD)

## Digital Legacy Vault (DLV)

| Field | Value |
|---|---|
| Document | Product Requirements Document |
| Product | Digital Legacy Vault (DLV) |
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Architecture Team |
| Canonical source | `PROJECT_MEMORY.md` |

---

## 1. Vision

**Digital Legacy Vault: the secure digital estate vault for individuals, families, and the professionals who serve them.**

When the worst happens — death, incapacity, a medical emergency — the documents that matter most are usually the hardest to find: the living will locked in a drawer, the insurance policy in an old email account, the crypto seed phrase nobody can recover. DLV, built by Stellr SA, gives every South African household and the professionals around them a single, provably secure place where these documents live, stay current, and become available to exactly the right people at exactly the right moment — through controlled sharing, ECTA-compliant e-signatures, and a multi-party-approved emergency access workflow. South Africa first; GDPR-ready for EU expansion.

## 2. Problem statement

1. **Fragmentation.** Estate-critical documents are scattered across drawers, email, cloud drives, and law-firm archives. Families routinely cannot locate wills, policies, or title deeds when an estate must be reported to the Master of the High Court.
2. **Emergency inaccessibility.** Hospitals cannot retrieve living wills and medical directives at 02:00; treatment decisions get made against the patient's documented wishes.
3. **Staleness.** Policies lapse, IDs and passports expire, beneficiary nominations go stale — and nobody is reminded.
4. **Digital-asset loss.** Crypto recovery information and password references die with their owner; assets are permanently lost.
5. **Professional friction.** Lawyers, financial advisers, and executors chase clients and families for documents over insecure email, with no audit trail and no verifiable integrity.
6. **Trust gap.** Generic cloud storage offers no estate semantics (executors, beneficiaries, death verification, emergency access), no evidentiary sealing, and no POPIA-first posture.

Existing options: generic cloud drives (no estate workflow, weak evidentiary value), international "legacy" apps (US-centric, no POPIA/ECTA/Wills Act awareness, no ZAR billing), and paper (single point of failure).

## 3. Target personas

Personas use the canonical role names from PROJECT_MEMORY §6.

### 3.1 Thandiwe — the organised parent (`REGISTERED_USER` → `PREMIUM_USER`)
- 38, Johannesburg, two children, married, employed professional.
- **Goals:** one safe place for the family's will, policies, IDs, and funeral instructions; know her husband and sister can get in if something happens to her.
- **Pain points:** documents spread across a drawer, Gmail, and a broker's office; doesn't know if her will scan is the latest version; worries generic cloud storage is neither private nor legally useful.

### 3.2 Pieter — the family steward (`FAMILY_ADMIN`)
- 52, Stellenbosch, manages affairs for his elderly parents and his own household.
- **Goals:** manage vaults for the extended family under one plan; make sure his parents' living wills are reachable by their GP and the local hospital; keep everything current.
- **Pain points:** juggling multiple logins; parents are not tech-savvy; no visibility into whether anything has expired or changed.

### 3.3 Adv. Naidoo — the estate attorney (`LAWYER`)
- Partner at a mid-size firm, drafts 200+ wills a year, frequently appointed executor.
- **Goals:** a professional dashboard of client vaults he has been granted access to; receive documents with verifiable integrity (hashes, seals); run signature ceremonies for mandates and directives; a defensible audit trail for the Master's office.
- **Pain points:** clients email photos of documents; originals go missing; proving document integrity in disputes is hard; wet-ink will execution logistics are unavoidable but the surrounding evidence chain is chaos.

### 3.4 Dr Mokoena — the emergency physician (`DOCTOR`) and Sr. van Wyk — hospital records lead (`HOSPITAL_ADMIN`)
- Trauma unit of a private hospital group.
- **Goals:** retrieve a patient's living will / medical directive within minutes under a lawful, audited emergency grant; zero access to anything else in the vault.
- **Pain points:** today there is no lawful, fast channel; families argue at the bedside; treating against unknown directives creates clinical and legal risk.

### 3.5 Sipho — the nominated executor (`EXECUTOR`)
- 45, nominated executor for his brother's estate; not a legal professional.
- **Goals:** know in advance what he's been nominated for; when the time comes, unlock exactly the executor scope (will, funeral instructions, policies) quickly and lawfully; export a clean evidence bundle for the Master.
- **Pain points:** executors typically start from nothing — no document inventory, no asset list, months of discovery.

### 3.6 Lerato — the financial adviser (`FINANCIAL_ADVISER`)
- Independent adviser with 300 clients.
- **Goals:** request and receive scoped access to clients' insurance/tax documents; get renewal reminders on client policies she manages; look professional and compliant.
- **Pain points:** chasing clients for policy schedules; emailing sensitive PDFs breaches her FSP compliance posture.

### 3.7 Nomsa — the beneficiary (`BENEFICIARY`)
- 29, daughter of a vault owner.
- **Goals:** when a grant applies, see only what was designated for her, with dignity and clarity; no technical hurdles at a traumatic time.
- **Pain points:** families locked out of everything for months during estate administration.

### 3.8 Riaan — the enterprise IT owner (`COMPANY_ADMIN`)
- Head of digital at a hospital group / law firm network.
- **Goals:** manage organisation members and roles, API keys and webhooks for system integration, consolidated billing, and demonstrable POPIA compliance to his board.
- **Pain points:** vendors without SA data residency, without audit trails, without enterprise SSO roadmaps.

### 3.9 Platform operations (`SYSTEM_ADMIN`, `SUPER_ADMIN`, `AUDITOR`, `SUPPORT_AGENT`)
- Stellr SA staff operating the platform: suspend abusive accounts, review death-verification evidence, place legal holds under dual control, run compliance reviews on the hash-chained audit trail, and support users without ever seeing document content.

## 4. Market positioning (South Africa first)

- **POPIA-first, af-south-1 resident.** SA customer data lives primarily in Cape Town (af-south-1) with DR in eu-west-1 — a concrete differentiator against US-hosted competitors.
- **Legally literate for SA.** Built-in ECTA advanced e-signature ceremonies for directives, mandates, and consent artefacts, and honest, prominent handling of the Wills Act 7 of 1953 wet-ink requirement: DLV is the secure repository, drafting assistant, and evidence-preservation layer for wills — never a claim of electronic will execution. Honesty here is the trust moat.
- **Emergency access as the killer feature.** Multi-party approval + time delay + full audit + owner notification: no generic cloud drive offers a lawful, auditable "hospital retrieves the living will at 02:00" flow.
- **Professionals as a channel.** Lawyers and financial advisers onboard their client bases (Professional tier), turning B2B relationships into B2C acquisition.
- **GDPR-ready** for EU expansion without re-architecture (cross-region design, data-subject tooling from day one).
- **Pricing in ZAR** via Stripe, with USD/EUR supported for expansion.

## 5. Pricing tiers

> **Assumption:** ZAR price points below are launch proposals for validation; VAT (15%) inclusive. Annual billing at ~2 months free. Quotas are configuration-driven (FR-BIL-001) and tunable pre-launch.

| Tier | Price (proposal) | Who | Storage / limits |
|---|---|---|---|
| **Free** | R0 | `REGISTERED_USER` | 500 MB, 25 documents, 1 vault |
| **Premium** (individual) | R99/month or R990/year | `PREMIUM_USER` | 20 GB, unlimited documents |
| **Family** | R199/month or R1,990/year | `FAMILY_ADMIN` + up to 6 members | 100 GB pooled |
| **Professional** | R499/month per seat | `LAWYER`, `FINANCIAL_ADVISER`, `DOCTOR` practices | 200 GB/seat, client workspace |
| **Enterprise** | From R4,999/month (custom, seat + volume) | Organisations via `COMPANY_ADMIN` / `HOSPITAL_ADMIN` | Custom quotas, contract |

### Feature-to-tier map

| Feature | Free | Premium | Family | Professional | Enterprise |
|---|---|---|---|---|---|
| Document upload + quarantine pipeline + versioning | ✓ | ✓ | ✓ | ✓ | ✓ |
| AI categorisation + OCR + full-text search | Basic (10 docs/mo AI) | ✓ | ✓ | ✓ | ✓ |
| AI summaries + NL search + estate recommendations | — | ✓ | ✓ | ✓ | ✓ |
| Secure links + QR (with expiry/revocation) | 3 active | Unlimited | Unlimited | Unlimited | Unlimited |
| Passkeys + TOTP 2FA | ✓ | ✓ | ✓ | ✓ | ✓ |
| Beneficiaries + executors | 1 executor, 2 beneficiaries | ✓ | ✓ | ✓ (per client) | ✓ |
| Emergency access workflow | — | ✓ | ✓ | ✓ | ✓ |
| Signature ceremonies (`SignatureRequest`) | — | 5/month | 10/month | 50/seat/month | Custom |
| Client-Encrypted Vault (per document) | — | ✓ | ✓ | ✓ | ✓ |
| Family member management (`FAMILY_ADMIN`) | — | — | ✓ | — | — |
| Client access requests + professional dashboard | — | — | — | ✓ | ✓ |
| Organisation console, `ApiKey`s, `Webhook`s, partner API | — | — | — | Limited (read API) | ✓ |
| Reminders (expiry + review) | Expiry only | ✓ | ✓ | ✓ | ✓ |
| Audit timeline (own vault) | 90 days | Full | Full | Full | Full + export |
| Priority support / SLA | — | — | — | Business hours | SLA-backed |

## 6. MVP definition vs later releases

### MVP (GA launch)
- Identity: registration, email verification, password + passkey + TOTP, sessions/devices, RBAC + ABAC, organisations (basic).
- Vault: upload ≤ 500 MB through quarantine pipeline, versioning, categories (full enum), tags, OCR, full-text search, AI categorisation, trash/restore, quotas.
- Sharing: `DocumentShare`, `SecureLink` + QR + expiry + revocation, access audit, owner notifications.
- Estate: beneficiaries, executor nomination/acceptance, emergency access policy + request + multi-party approval + delay + grant, death verification (manual review), executor unlock, medical living-will expedited scope.
- Signature: full built-in ceremony with cryptographic seal (SHA-256 + RFC 3161 + evidence bundle), Wills Act notice.
- Notification: email/SMS/WhatsApp/push, expiry reminders, security-critical override.
- Billing: all five plans, Stripe checkout + billing portal + webhooks + dunning/read-only.
- Audit: hash-chained events, owner timeline, auditor console, Object Lock export.
- Admin: suspension, quotas, death-verification queue, legal holds (dual control), support consent access.
- Integration: `ApiKey`s, core REST API, webhooks (Enterprise), GraphQL dashboard reads.
- PWA, WCAG 2.2 AA, POPIA data-subject tooling.

### Release 1.x (post-GA)
- Client-Encrypted Vault GA hardening (Shamir trustee recovery UX), inactivity check-in ("proof of life"), estate readiness score, AI summaries + NL search GA, digest notifications, bulk upload polish, org-scoped shares, sealed emergency-access PDF reports, sandbox partner onboarding.

### Release 2.x
- Enterprise SAML SSO, DocuSign integration point activation (if demanded), Home Affairs death-verification integration (if API access materialises), additional languages (isiZulu, Afrikaans), EU go-to-market, mobile-native wrappers if PWA metrics warrant, will-drafting assistant expansion with attorney-review marketplace.

## 7. Success metrics / KPIs

| Category | Metric | Target (12 months post-GA) |
|---|---|---|
| Acquisition | Registered users | 50,000 |
| Activation | % of new users with ≥ 3 documents + 1 executor nominated within 14 days | ≥ 35% |
| Conversion | Free → paid conversion | ≥ 6% |
| Revenue | MRR | R1.5 m |
| Retention | Paid logo churn (monthly) | ≤ 2.5% |
| Engagement | Vaults with emergency policy configured | ≥ 40% of paid |
| Professional channel | Professional seats; clients onboarded per seat | 500 seats; ≥ 10 clients/seat |
| Trust/ops | Availability; emergency-access grant lead time within policy; audit-chain verification failures | 99.9%; 100% within policy; 0 |
| Security | Quarantine catch rate on malware test corpus; sev-1 security incidents | 100%; 0 |
| Quality | WCAG 2.2 AA audit issues open > 30 days | 0 critical |

## 8. Out of scope

1. Electronic execution of wills (Wills Act wet-ink requirement) — permanent positioning constraint, not a backlog item.
2. Legal advice of any kind (referrals only).
3. Custody of crypto assets / wallet functionality — recovery *information* storage only (`CRYPTO_RECOVERY`).
4. Probate/estate-administration case management (export bundles support external processes).
5. Physical document scanning/courier services.
6. Full zero-knowledge platform encryption (tiered model is the fixed design — canonical decision 4).
7. DocuSign or other external e-sign providers at launch (integration point reserved).
8. SAML enterprise SSO at launch (OAuth2/OIDC only; SAML later).
9. US HIPAA BAAs at launch (HIPAA-ready architecture only).
10. Marketplace of attorneys/advisers (Release 2.x exploration).

## 9. Key risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Users mistake e-signed wills for legally executed wills → reputational/legal harm | Medium | Critical | Mandatory Wills Act notices (FR-SIG-007), copy review by counsel, positioning discipline in all marketing |
| R2 | Emergency access abused (fraudulent death claim) | Low | Critical | Multi-party approval + delay + owner veto + dual verification (professional + platform) + full audit (invariant 6) |
| R3 | Emergency access too slow in genuine medical crises → clinical harm, PR damage | Medium | High | Expedited living-will scope (FR-EST-009), hospital onboarding playbooks, synthetic probes on the retrieval path |
| R4 | Client-Encrypted Vault key loss → permanent data loss, support burden | Medium | High | Shamir trustee recovery, forced acknowledgement UX, default remains Standard tier |
| R5 | af-south-1 service gaps (e.g., Textract) delay features | Medium | Medium | Documented fallbacks (self-hosted Tesseract), region-aware architecture |
| R6 | Low willingness-to-pay in SA consumer market | Medium | High | Freemium funnel, family pooling, professional channel as B2B2C engine, annual discounting |
| R7 | WhatsApp Business API approval delays | Medium | Low | SMS fallback wired first; WhatsApp additive |
| R8 | POPIA enforcement action from a data incident | Low | Critical | Security invariants, ASVS L2 + pen tests, breach runbook, Information Officer processes |
| R9 | AI misclassification of sensitive documents erodes trust | Medium | Medium | Human confirmation loop (FR-AI-001), confidence display, per-vault AI off switch |
| R10 | Stripe ZAR/local payment coverage gaps (debit orders, instant EFT preference) | Medium | Medium | Monitor conversion; evaluate local PSP adjunct post-launch (decision change would go through PROJECT_MEMORY) |

## 10. Open questions

Tracked for resolution before build of the affected feature; each has a working assumption so nothing blocks Phase 2.

| # | Question | Working assumption until resolved |
|---|---|---|
| Q1 | Exact ZAR price points and quota tuning after pricing research | Table in §5 stands |
| Q2 | Whether Masters' offices/courts will accept DLV sealed evidence bundles in practice | Bundles designed to ECTA evidentiary standards; attorney advisory panel to validate format |
| Q3 | Hospital-group procurement requirements (clinical governance sign-off) for the emergency retrieval flow | Enterprise tier includes governance documentation pack |
| Q4 | Demand for local payment methods beyond cards (debit order, Instant EFT) | Stripe cards at launch (canonical decision 10); revisit with conversion data |
| Q5 | Priority order of isiZulu vs Afrikaans localisation | English launch; decide from user-base analytics |
| Q6 | Whether inactivity check-in should ship in MVP | Scheduled 1.x (FR-EST-011 = Should) |

---

*End of PRD v1.0.0 — conforms to PROJECT_MEMORY.md (2026-07-05).*
