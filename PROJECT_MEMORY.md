# PROJECT MEMORY — Digital Legacy Vault

> **Purpose:** Single source of truth for all architectural, naming, and product decisions.
> Every future phase and prompt MUST conform to this document. If a decision changes, update it here first.
> **Last updated:** 2026-07-20 (Phase 9 — hardening, pentest & SOC 2 readiness)

---

## 1. Product identity

| Item | Decision |
|---|---|
| Product name | **Digital Legacy Vault** (DLV) |
| Tagline | Secure digital estate vault for individuals, families, and the professionals who serve them |
| Company context | Built by Stellr SA |
| Primary market | South Africa first; GDPR-ready for EU expansion |
| Business model | Freemium SaaS + organisation (B2B) plans, billed via Stripe |

## 2. Canonical decisions (stated assumptions)

These were not fully specified in the brief; they are now **fixed decisions**:

1. **Jurisdiction:** POPIA is the primary privacy framework. GDPR compliance designed in from day one. ISO 27001 alignment; SOC 2 Type II is a certification target, not a launch blocker. HIPAA-*ready* architecture (BAAs only if/when US healthcare customers onboard).
2. **Legal validity of wills:** Under the SA Wills Act 7 of 1953, a valid will requires a wet-ink signature with witnesses. DLV therefore positions e-signatures (ECTA-compliant advanced electronic signatures) as valid for directives, mandates, and consent artefacts, and positions itself as the **secure repository, drafting assistant, and evidence-preservation layer** for wills — not a replacement for legal execution. UI must communicate this clearly.
3. **AWS regions:** `af-south-1` (Cape Town) primary; `eu-west-1` (Ireland) for DR + cross-region replication. Data-residency controls keep SA customer data primary in af-south-1.
4. **Zero-knowledge scope:** Full zero-knowledge encryption conflicts with server-side OCR/AI/search and emergency access. Decision: **tiered encryption model** — Standard tier (envelope encryption, server-processable) by default; optional **Client-Encrypted Vault** per document (client-side AES-256-GCM, key never leaves user custody, AI/OCR disabled for those objects, recovery via Shamir secret-sharing among trustees).
5. **Monorepo:** pnpm workspaces + Turborepo. One repo: `digital-legacy-vault`.
6. **Kubernetes:** AWS EKS, deployed via Helm charts, GitOps with Argo CD. Terraform owns all cloud resources.
7. **GraphQL scope:** REST (`/api/v1`, OpenAPI 3.1) is the primary contract for writes and integrations. GraphQL (`/graphql`, code-first NestJS) serves read-heavy dashboard/timeline queries. Webhooks for outbound events.
8. **AI provider:** Anthropic Claude API via a provider-abstraction layer (`AiGateway`) so models can be swapped. AI never receives Client-Encrypted Vault content. Textract for OCR (af-south-1 fallback: self-hosted Tesseract worker).
9. **E-signature:** Built-in signature ceremony (draw/type/upload + cryptographic seal: SHA-256 digest, RFC 3161 trusted timestamp, signer identity + device evidence bundle). No DocuSign dependency at launch; integration point reserved.
10. **Payments:** Stripe (cards) + Stripe billing portal. ZAR primary currency, USD/EUR supported.
11. **Notifications:** Email = AWS SES; SMS + WhatsApp = Twilio (WhatsApp Business API); push = web push (PWA).
12. **Virus scanning:** ClamAV in a quarantine pipeline (S3 quarantine bucket → scan → promote or reject) + file-type validation via magic bytes.

## 3. Technology stack (locked versions/majors)

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5.x strict, TailwindCSS 4, PWA (next-pwa), WCAG 2.2 AA |
| Backend | NestJS 11, TypeScript 5.x strict, REST + GraphQL (Apollo driver), OpenAPI via @nestjs/swagger |
| AuthN | OIDC-compliant auth module: JWT access (15 min, RS256, JWKS) + rotating refresh tokens (httpOnly), WebAuthn passkeys, TOTP 2FA, OAuth2 social/enterprise SSO (SAML later) |
| AuthZ | RBAC (roles below) + ABAC policy engine (CASL) — resource-, attribute-, and relationship-based checks |
| Database | PostgreSQL 16 (RDS Multi-AZ), Prisma ORM, Redis 7 (ElastiCache) for sessions/cache/queues (BullMQ) |
| Storage | S3: versioning, Object Lock (compliance mode) for signed/legal docs, SSE-KMS, lifecycle → Glacier, CRR to eu-west-1 |
| Infra | AWS, Docker, EKS, Terraform, Helm, Argo CD, GitHub Actions, CloudFront, WAF, Shield, Route 53, Secrets Manager, KMS, CloudWatch, GuardDuty, Security Hub, Inspector |

## 4. Bounded contexts (DDD modules)

`identity` (users, orgs, auth, roles) · `vault` (documents, versions, metadata, OCR) · `sharing` (shares, secure links, QR, access requests) · `estate` (beneficiaries, executors, emergency access, death verification workflow) · `signature` (signing ceremonies, seals, evidence) · `notification` (email/SMS/WhatsApp/push, reminders) · `billing` (plans, subscriptions, Stripe) · `audit` (immutable audit events, activity timeline) · `ai` (classification, summaries, recommendations, NL search) · `admin` (back-office) · `integration` (API keys, webhooks, partner APIs)

## 5. Core domain entities (canonical names)

`User`, `Organisation`, `OrganisationMember`, `Vault`, `Document`, `DocumentVersion`, `DocumentCategory`, `Tag`, `DocumentShare`, `SecureLink`, `Beneficiary`, `Executor`, `EmergencyAccessRequest`, `EmergencyAccessGrant`, `SignatureRequest`, `Signature`, `AuditEvent`, `Notification`, `Reminder`, `Subscription`, `Plan`, `ApiKey`, `Webhook`, `Device`, `Session`, `Consent`, `LegalHold`

Document type enum: `LIVING_WILL, LAST_WILL, POWER_OF_ATTORNEY, MEDICAL_DIRECTIVE, INSURANCE, PASSPORT, IDENTITY_DOCUMENT, MARRIAGE_CERTIFICATE, BIRTH_CERTIFICATE, TRUST, PROPERTY, VEHICLE_REGISTRATION, BUSINESS, EMPLOYMENT_CONTRACT, FUNERAL_INSTRUCTIONS, EMERGENCY_CONTACTS, PASSWORD_REFERENCE, CRYPTO_RECOVERY, MEDICAL_RECORD, TAX, OTHER`

## 6. Roles (canonical)

`GUEST, REGISTERED_USER, PREMIUM_USER, FAMILY_ADMIN, EXECUTOR, BENEFICIARY, LAWYER, DOCTOR, HOSPITAL_ADMIN, FINANCIAL_ADVISER, COMPANY_ADMIN, SYSTEM_ADMIN, SUPER_ADMIN, AUDITOR, SUPPORT_AGENT`

Role semantics: platform roles (SYSTEM_ADMIN, SUPER_ADMIN, AUDITOR, SUPPORT_AGENT) vs vault-relationship roles (EXECUTOR, BENEFICIARY, etc., always scoped to a specific Vault via ABAC).

## 7. Security invariants (never violate)

1. All data encrypted at rest (AES-256) and in transit (TLS 1.3 only).
2. Envelope encryption: per-document DEK (AES-256-GCM) wrapped by KMS CMK; per-tenant key hierarchy; annual + on-demand rotation.
3. Field-level encryption for PII columns (ID numbers, crypto recovery refs, emergency contacts).
4. Audit events are append-only (Postgres + S3 Object Lock export); hash-chained (each event includes SHA-256 of previous).
5. Every uploaded object: quarantine → ClamAV scan → magic-byte validation → SHA-256 hash recorded → promote.
6. Emergency access always requires multi-party approval + time delay + full audit + notification to owner.
7. No secrets in code/env files; AWS Secrets Manager only.
8. Deny-by-default authorization; every endpoint has an explicit policy.

## 8. Conventions

- Files: kebab-case. Classes/types: PascalCase. Variables/functions: camelCase. DB tables: snake_case plural. Enums: SCREAMING_SNAKE.
- API: `/api/v1/...`, plural resources, cursor pagination, RFC 9457 problem+json errors, idempotency keys on POST.
- IDs: UUIDv7. Timestamps: `timestamptz`, UTC. Money: integer minor units + currency code.
- Commits: Conventional Commits. Branching: trunk-based (`main` + short-lived `feat/…`, `fix/…`), release tags `vX.Y.Z`.
- Environments: `dev` → `staging` → `prod`.

## 9. Operational policy defaults (reconciled Phase 1)

| Policy | Canonical value |
|---|---|
| Max upload size | **500 MB** per file, resumable multipart via pre-signed URL |
| Quarantine pipeline SLA | p95 ≤ 5 min scan+validate+promote |
| Emergency access — approvers | Minimum 2; requester can never self-approve; SUPPORT_AGENT/SYSTEM_ADMIN excluded |
| Emergency access — delay | Default **72 h**, owner-configurable 24 h – 30 d; death claims default **7 d** (48 h floor); medical-directive-only scope expeditable to **1 h** with dual medical-professional approval |
| Emergency access — grant | Read-only, time-boxed default **30 days**, scoped to owner-preselected categories |
| Secure link expiry | Default 7 days, max 90 |
| Retention | Signed artefacts + audit: 7 years; trash: 30 days; account deletion cooling-off: 14 days |
| Dunning | 14-day grace → read-only; never delete for non-payment |
| Client-Encrypted Vault recovery | Shamir 3-of-5 default |
| DR | RPO 15 min, RTO 4 h, pilot-light eu-west-1 |
| Domain | dlv.stellr-net.com (working assumption) |
| **Launch status** | **GA-ready (v1.0.0)** — all 10 phases code-complete 2026-07-20; flips to **Live** after the 14-day post-launch SLO watch passes (`slo-watch-check.mjs`) |

## 10. Phase log

| Phase | Status | Output |
|---|---|---|
| 1 — Requirements & Architecture | ✅ Complete (this commit) | Full docs/ tree, PROJECT_STATE.md |
| 2 — Foundation (monorepo scaffold, identity context, CI) | ✅ Code-complete 2026-07-07 (exit criteria = live-AWS steps, see PROJECT_STATE runbook) | Monorepo apps (api, web, workers) + packages (config, crypto, shared-types, shared-kernel, design-tokens, ui); identity API (register→verify→login→refresh→logout→/me, TOTP+recovery, WebAuthn passkeys, sessions, organisations); RBAC/CASL (ability factory + PoliciesGuard); audit hash-chain; health; Redis throttler; Terraform (bootstrap + modules vpc/kms/eks/rds/redis/s3-documents + envs/dev); Helm umbrella chart (api/web/workers) + Argo CD app-of-apps; CI (ci/terraform/deploy-dev); pnpm lockfile. All builds/tests green |
| 3 — Vault Core (documents) | ✅ Code-complete 2026-07-07 (exit criteria = live-env journey/SLA, see PROJECT_STATE runbook) | Upload pipeline (multipart→quarantine→ClamAV→magic-byte→SHA-256→envelope-encrypt→promote→version); @dlv/crypto envelope (per-doc DEK+KMS) + Shamir; Document/DocumentVersion/Category/Tag + FTS; OCR (Textract/Tesseract) + Postgres FTS; timeline (audit hash-chain); Client-Encrypted Vault (web WebCrypto + Shamir 3-of-5); web dropzone/cards/preview; ClamAV in chart. api Jest 43/43 incl. abuse suite |
| 4 — Sharing & Estate | ✅ Code-complete 2026-07-07 (exit = E2E journeys 3–5 live + legal review) | Sharing (DocumentShare, SecureLink hashed-token+QR+expiry/revoke, AccessRequest); Estate (Beneficiary/Executor, emergency-access engine: quorum/no-self-approve/staff-excluded/time-delay/medical-dual-approval/owner-notify/scoped read-only grant §7.6/§9, death-verification v1); vault-relationship ABAC (RelationshipAccessService); web share dialog+QR + /legacy hub. api Jest 72/72 incl authz matrix |
| 5 — Signatures & Compliance | ✅ Code-complete 2026-07-16 (exit = live env + ECTA legal opinion) | Signature context: ceremony (draw/type/upload capture + ECTA consent), cryptographic seal (SHA-256 evidence digest + RFC 3161 trusted timestamp via TSA adapter/dev fallback + signer/device evidence bundle, §2.9), independent seal-verification tool; @dlv/crypto seal+timestamp primitives; SignatureRequest/Signature models + enums; web /signatures ceremony UI. api Jest 79/79, crypto 88/88 (100% cov), api+web tsc 0 errors. Outstanding: S3 Object Lock, LegalHold, Consent context, POPIA/GDPR DSR, wills wet-ink UX, legal opinion |
| 6 — Billing & Notifications | ✅ Code-complete 2026-07-17 (MVP line; exit = live Stripe test-clocks/E2E journey 7 + MVP sign-off) | Billing (config-driven Plan catalogue + Subscription, Stripe checkout/portal/webhooks via fetch + dev fallback, 14-day dunning grace→read-only, EntitlementService gating monthly signatures + document/storage limits); Notification (email/SMS/WhatsApp/web-push behind ChannelSender port + dev-log, per-category prefs with non-disableable security/emergency, reminders, push subscriptions); Admin back-office v1 (role-gated audit search + user support summary); PWA install prompt + web /billing, /settings/notifications, /admin. api Jest 110/110, api+web tsc 0 |
| 7 — AI Features | ✅ Code-complete 2026-07-19 (exit = live re-measure of precision with Claude + telemetry audit/dashboards on a live env) | AI context: `AiGateway` over Anthropic Claude (fetch, offline dev fallback); classification + auto-categorisation (`AiInsight`, apply-to-document), summaries, completeness recommendations (pure rules), NL search (STANDARD-only FTS); client-encrypted exclusion type-enforced (`ServerProcessableText`) + SQL-level; cost budgets instrumented (`AiUsage` micro-USD + daily cap); plan gating via `EntitlementService.assertCanUseAiDoc` (FREE 10 docs/mo); disclosure UX + per-user opt-out (`AiPreference`, audited); web /assistant + /settings/ai. api Jest 140/140; synthetic-corpus precision gate ≥90% green |
| 8 — Organisations, Enterprise & Integrations API | ✅ Code-complete 2026-07-19 (exit = org onboarding E2E + contract published + webhook soak, live env) | Organisation context: consent-gated professional client-vault relationships (LAWYER/DOCTOR/FINANCIAL_ADVISER, scope FULL/CATEGORY/MEDICAL_ONLY, unified into estate ABAC via CLIENT_RELATIONSHIP_READER), org usage metering, data-residency controls (af-south-1/eu-west-1, audited). Enterprise SSO: per-org OIDC connections (field-encrypted secret, domain routing, single-use Redis state, JIT provisioning, SessionEstablisher amr=['sso']). Integration context: SHA-256-hashed scoped API keys + ApiKeyGuard/@RequireScopes, partner API v1 (metadata only) with OpenAPI 3.1 contract + versioning policy (docs/08-api), webhooks with show-once field-encrypted secrets, HMAC-signed deliveries (t,v1 replay-bound) + 1m/5m/30m/2h/6h retries → dead-letter. Web /organisation hub. api Jest 173/173 |
| 9 — Hardening, Pentest & SOC 2 Readiness | ✅ Code-complete (in-repo) 2026-07-20 (exit = external pentest + DR drill exec + SOC 2 window + a11y audit + go/no-go, all live/external) | Security hardening (helmet CSP/HSTS/COOP/CORP per security-arch, strict CORS allow-list, body-size cap, RFC 9116 security.txt); M-02 full authz matrix (15 roles×11 subjects×4 actions, deny-by-default, CI gate); E2E journeys 3–8 + journey 9 (axe WCAG 2.2 AA), gated Playwright; DR failover runbook + dr-drill-check.mjs (RPO 15m/RTO 4h) + drill log; SOC 2 readiness pack (TSC control matrix, policy index, POPIA/GDPR data-processing); accessibility audit doc; pentest scope + GA go/no-go checklist. api Jest 195/195 |
| 10 — GA Launch | ✅ Launch artefacts code-complete 2026-07-20 (exit = signed GA checklist + 14-day SLO watch ≥50% budget → status Live; all live) | GA launch runbook (staged canary cutover + <5 min rollback triggers/procedure, feature-flag plan), SLO/error-budget definitions (9 SLOs + burn-rate alerting) + 2-week war-room watch plan, GA sign-off checklist (eng/design/security/legal), release process + v1.0.0 release notes, slo-watch-check.mjs (gates the status-to-Live flip). Codebase feature+hardening+launch complete across all 10 roadmap phases |

## 11. Document map

See `PROJECT_STATE.md` for the authoritative file inventory and next actions.
