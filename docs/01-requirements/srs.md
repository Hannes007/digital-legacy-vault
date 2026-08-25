# Software Requirements Specification (SRS)

## Digital Legacy Vault (DLV)

| Field | Value |
|---|---|
| Document | Software Requirements Specification |
| Product | Digital Legacy Vault (DLV) |
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Architecture Team |
| Canonical source | `PROJECT_MEMORY.md` (this document conforms to it; on conflict, PROJECT_MEMORY.md wins) |

---

## 1. Introduction

### 1.1 Purpose

This SRS defines the complete functional and non-functional requirements for **Digital Legacy Vault (DLV)**, an enterprise SaaS secure digital estate vault built by Stellr SA. It is the contract between product, architecture, engineering, security, and compliance stakeholders for Phase 1 (Requirements & Architecture) and the implementation phases that follow. It is written to an IEEE-830-inspired structure and is intended to be testable: every functional requirement carries a MoSCoW priority and acceptance criteria.

### 1.2 Scope

DLV enables individuals, families, and the professionals who serve them (lawyers, doctors, hospitals, executors, financial advisers, and organisations) to:

- Store, version, categorise, and search sensitive estate documents — living wills, last wills, powers of attorney, medical directives, insurance policies, identity documents, property deeds, crypto recovery information, and more.
- Share documents securely via scoped shares, secure links, and QR codes with expiry and revocation.
- Execute ECTA-compliant advanced electronic signature ceremonies for directives, mandates, and consent artefacts.
- Manage beneficiaries and executors, and operate a controlled, multi-party-approved emergency access workflow including death verification and executor vault unlock.
- Receive reminders and notifications across email, SMS, WhatsApp, and web push.
- Subscribe to Free, Premium, Family, Professional, and Enterprise plans billed via Stripe (ZAR primary).
- Integrate via a versioned REST API (`/api/v1`), GraphQL read API, API keys, and webhooks.

**Out of scope for this product (see also PRD §Out of Scope):** legal execution of wills (wet-ink signing and witnessing under the SA Wills Act 7 of 1953 remains a physical process; DLV is the secure repository, drafting assistant, and evidence-preservation layer), legal advice, probate case management, and custody of crypto assets themselves (DLV stores recovery *information*, never acts as a wallet).

### 1.3 Definitions, acronyms, and abbreviations

| Term | Definition |
|---|---|
| DLV | Digital Legacy Vault |
| Vault | The canonical `Vault` entity: a user's or organisation's encrypted container of documents |
| Client-Encrypted Vault | Optional per-document client-side AES-256-GCM encryption; keys never leave user custody; AI/OCR disabled for those objects; recovery via Shamir secret-sharing among trustees |
| Standard tier encryption | Default envelope encryption (per-document DEK wrapped by KMS CMK), server-processable for OCR/AI/search |
| DEK / CMK | Data Encryption Key / Customer Master Key (AWS KMS) |
| POPIA | Protection of Personal Information Act 4 of 2013 (South Africa) |
| GDPR | EU General Data Protection Regulation |
| ECTA | Electronic Communications and Transactions Act 25 of 2002 (South Africa) |
| AES | Advanced Electronic Signature as defined by ECTA |
| Wills Act | SA Wills Act 7 of 1953 — requires wet-ink signature with witnesses for a valid will |
| Emergency access | The `estate` context workflow by which an `EmergencyAccessRequest` becomes an `EmergencyAccessGrant` after multi-party approval, time delay, and audit |
| Quarantine pipeline | Upload path: S3 quarantine bucket → ClamAV scan → magic-byte validation → SHA-256 hash recorded → promote or reject |
| RBAC / ABAC | Role-Based / Attribute-Based Access Control (CASL policy engine) |
| MoSCoW | Must / Should / Could / Won't (this release) prioritisation |
| RFC 3161 | Trusted timestamping protocol used in signature seals |
| RFC 9457 | Problem Details for HTTP APIs (error format) |
| PWA | Progressive Web App |
| CRR | S3 Cross-Region Replication (af-south-1 → eu-west-1) |

### 1.4 References

- `PROJECT_MEMORY.md` — canonical decisions, stack, entities, roles, security invariants.
- `docs/01-requirements/prd.md`, `user-stories.md`, `use-cases.md` (this folder).
- POPIA, GDPR, ECTA, Wills Act 7 of 1953, ISO/IEC 27001:2022, SOC 2 Trust Services Criteria, HIPAA Security Rule (readiness reference), WCAG 2.2.

### 1.5 Overview of this document

Section 2 gives the overall description; Section 3 lists functional requirements grouped by bounded context; Section 4 lists non-functional requirements; Section 5 covers external interfaces; Section 6 covers data retention and deletion; Section 7 covers constraints and assumptions.

---

## 2. Overall description

### 2.1 Product perspective

DLV is a cloud-native multi-tenant SaaS on AWS (`af-south-1` primary, `eu-west-1` DR/CRR). It is a pnpm/Turborepo monorepo (`digital-legacy-vault`) with a Next.js 15 (App Router, React 19, TailwindCSS 4, PWA) frontend and a NestJS 11 backend exposing REST (`/api/v1`, OpenAPI 3.1) for writes and integrations and GraphQL (`/graphql`, code-first) for read-heavy dashboard/timeline queries. PostgreSQL 16 (RDS Multi-AZ) with Prisma, Redis 7 (ElastiCache) for sessions/cache/BullMQ queues, S3 with versioning, Object Lock (compliance mode) for signed/legal documents, SSE-KMS, lifecycle to Glacier, and CRR. Deployment: Docker on EKS via Helm and Argo CD (GitOps); Terraform owns all cloud resources; GitHub Actions CI.

The system decomposes into eleven bounded contexts (DDD): `identity`, `vault`, `sharing`, `estate`, `signature`, `notification`, `billing`, `audit`, `ai`, `admin`, `integration`.

### 2.2 Product functions (summary)

1. Identity & access: registration, OIDC-compliant login, WebAuthn passkeys, TOTP 2FA, OAuth2 social/enterprise SSO (SAML later), sessions, devices, organisations, RBAC + ABAC.
2. Vault: upload through quarantine pipeline, versioning, categorisation (21-value document type enum), tags, OCR, metadata, full-text and natural-language search, optional Client-Encrypted Vault.
3. Sharing: `DocumentShare` grants, `SecureLink` with QR, expiry, revocation, access requests.
4. Estate: `Beneficiary` and `Executor` management, `EmergencyAccessRequest`/`EmergencyAccessGrant` with death verification, multi-party approval, time delay.
5. Signature: signing ceremonies (draw/type/upload) with cryptographic seal — SHA-256 digest, RFC 3161 trusted timestamp, signer identity + device evidence bundle.
6. Notification: email (SES), SMS + WhatsApp (Twilio), web push; `Reminder` scheduling.
7. Billing: `Plan`/`Subscription` lifecycle via Stripe; ZAR primary, USD/EUR supported.
8. Audit: append-only, hash-chained `AuditEvent` stream with activity timeline and Object Lock export.
9. AI: classification, summaries, recommendations, natural-language search via `AiGateway` (Anthropic Claude API); never receives Client-Encrypted Vault content.
10. Admin: back-office account management, suspension, legal holds, support tooling.
11. Integration: `ApiKey` management, `Webhook` subscriptions, partner APIs.

### 2.3 User classes and characteristics

Canonical roles (see PROJECT_MEMORY §6). Platform roles apply system-wide; vault-relationship roles are always scoped to a specific `Vault` via ABAC.

| Role | Class | Characteristics |
|---|---|---|
| `GUEST` | Public | Unauthenticated visitor; marketing pages, secure-link redemption (scoped), registration |
| `REGISTERED_USER` | Individual | Free-tier vault owner; limited storage and features |
| `PREMIUM_USER` | Individual | Paid individual; full vault, signing, AI features |
| `FAMILY_ADMIN` | Family | Manages a family plan, invites members, oversees shared family vault structures |
| `EXECUTOR` | Vault-relationship | Nominated executor of a specific vault; participates in emergency access and vault unlock |
| `BENEFICIARY` | Vault-relationship | Nominated beneficiary; may receive scoped access on grant |
| `LAWYER` | Professional | Manages client relationships, witnesses processes, professional dashboard |
| `DOCTOR` | Professional | Verifies death/medical facts in workflows; retrieves living wills under emergency grants |
| `HOSPITAL_ADMIN` | Professional/org | Manages hospital organisation members; initiates emergency retrieval of medical directives |
| `FINANCIAL_ADVISER` | Professional | Views client-shared insurance/financial documents, sets review reminders |
| `COMPANY_ADMIN` | Organisation | Administers an `Organisation`: members, API keys, webhooks, billing |
| `SYSTEM_ADMIN` | Platform | Operates the platform back-office (suspend accounts, quotas, feature flags) |
| `SUPER_ADMIN` | Platform | Highest privilege; role assignment, legal hold, break-glass with dual control |
| `AUDITOR` | Platform | Read-only access to audit trails and compliance reports |
| `SUPPORT_AGENT` | Platform | Scoped, consent-gated support access; never sees document content |

### 2.4 Operating environment

- Browsers: latest two major versions of Chrome, Edge, Firefox, Safari (desktop + mobile); PWA installable on iOS/Android.
- Server: AWS af-south-1 primary; eu-west-1 DR. TLS 1.3 only, CloudFront + WAF + Shield at the edge.
- Environments: `dev` → `staging` → `prod`.

### 2.5 Design and implementation constraints

- Technology stack is locked per PROJECT_MEMORY §3 (Next.js 15, NestJS 11, PostgreSQL 16, Prisma, Redis 7, S3, EKS, Terraform, Helm, Argo CD).
- Security invariants in PROJECT_MEMORY §7 are non-negotiable and restated as NFRs in §4.4.
- IDs are UUIDv7; timestamps `timestamptz` UTC; money stored as integer minor units + currency code.
- API conventions: `/api/v1`, plural resources, cursor pagination, RFC 9457 problem+json errors, idempotency keys on POST.
- No secrets in code or env files; AWS Secrets Manager only.

### 2.6 Assumptions and dependencies

1. **Wills Act caveat (assumption, legal position fixed):** a valid SA will requires wet-ink signature with witnesses. DLV e-signatures (ECTA AES) are valid for directives, mandates, and consent artefacts only. The UI must state this wherever a `LAST_WILL` is uploaded, drafted, or signed.
2. Stripe operates as merchant of record integration for ZAR card billing; Stripe billing portal handles self-service payment updates.
3. Amazon Textract is used for OCR; where unavailable in af-south-1, a self-hosted Tesseract worker is the fallback (canonical decision).
4. Twilio WhatsApp Business API approval is obtained before WhatsApp notifications go live; SMS is the interim fallback.
5. Death verification depends on human evidence review (death certificate upload + verifier attestation); DLV does not integrate with the SA Department of Home Affairs population register at launch (assumed unavailable as a public API; manual verification workflow is designed to accommodate a future integration).
6. Anthropic Claude API is reachable from the VPC via egress controls through the `AiGateway` abstraction; models are swappable.

---

## 3. Functional requirements

Requirement ID scheme: `FR-<CTX>-nnn` where CTX ∈ IDN (identity), VLT (vault), SHR (sharing), EST (estate), SIG (signature), NTF (notification), BIL (billing), AUD (audit), AI (ai), ADM (admin), INT (integration). Priorities: **M**ust, **S**hould, **C**ould, **W**on't (this release).

### 3.1 Identity context (`identity`)

| ID | Requirement | Priority |
|---|---|---|
| FR-IDN-001 | The system shall allow a `GUEST` to register with email + password, creating a `User` and a default `Vault`. | M |
| FR-IDN-002 | The system shall verify email ownership via a time-limited (24 h), single-use verification link before the account is activated. | M |
| FR-IDN-003 | The system shall support WebAuthn passkey registration and authentication as a primary credential (passwordless) and as a second factor. | M |
| FR-IDN-004 | The system shall support TOTP 2FA enrolment (RFC 6238) with QR provisioning and 10 single-use recovery codes. | M |
| FR-IDN-005 | The system shall enforce 2FA (passkey or TOTP) for all platform roles (`SYSTEM_ADMIN`, `SUPER_ADMIN`, `AUDITOR`, `SUPPORT_AGENT`) and for any user enabling emergency access or Client-Encrypted Vault features. | M |
| FR-IDN-006 | The system shall issue JWT access tokens (15-minute lifetime, RS256, published JWKS) and rotating refresh tokens in httpOnly cookies; refresh token reuse shall revoke the token family. | M |
| FR-IDN-007 | The system shall support OAuth2 social login (Google, Apple, Microsoft) mapped to the same `User` identity via verified email linking. | S |
| FR-IDN-008 | The system shall list active `Session` and `Device` records per user and allow remote revocation of any session. | M |
| FR-IDN-009 | The system shall enforce RBAC using the canonical roles and ABAC (CASL) policies; authorization is deny-by-default and every endpoint declares an explicit policy. | M |
| FR-IDN-010 | The system shall support `Organisation` creation with `OrganisationMember` records, member invitation by email, and role assignment (`COMPANY_ADMIN`, `HOSPITAL_ADMIN`, professional roles) scoped to the organisation. | M |
| FR-IDN-011 | The system shall support secure password reset via time-limited (1 h), single-use email link; reset invalidates all sessions and notifies the user on all verified channels. | M |
| FR-IDN-012 | The system shall lock an account for 15 minutes after 5 consecutive failed login attempts and notify the account owner; CAPTCHA is required after 3 failures. | M |
| FR-IDN-013 | The system shall record a `Consent` entity for each consent event (terms, privacy policy version, marketing, biometric processing) with timestamp and policy version. | M |
| FR-IDN-014 | The system shall support enterprise SSO via OAuth2/OIDC for organisations; SAML support is deferred (Won't this release, integration point reserved). | W |
| FR-IDN-015 | The system shall allow users to change their email address with re-verification of the new address and notification to the old address. | S |
| FR-IDN-016 | The system shall enforce password policy: minimum 12 characters, zxcvbn score ≥ 3, breached-password check against a k-anonymity API. | M |

**Acceptance criteria (identity, representative):**
- FR-IDN-001: Given a valid email and compliant password, when the user submits registration, then a `User` (status pending-verification), default `Vault`, and `Consent` records are created, an `AuditEvent` is written, and a verification email is sent within 60 seconds.
- FR-IDN-003: Given a browser supporting WebAuthn, when the user registers a passkey, then a `Device` record with credential ID and attestation metadata is stored, and subsequent login completes with passkey alone (user-verification required).
- FR-IDN-006: Given a refresh token that has already been rotated, when it is presented again, then the entire token family is revoked, all sessions for that family end, and a security notification is sent.
- FR-IDN-009: Given any API request without a matching allow policy, when evaluated, then the response is 403 problem+json and an `AuditEvent` of type `AUTHZ_DENIED` is recorded.
- FR-IDN-012: Given 5 failed logins within 15 minutes, when a 6th attempt occurs, then it is rejected regardless of credential validity and the owner is notified by email.

### 3.2 Vault context (`vault`)

| ID | Requirement | Priority |
|---|---|---|
| FR-VLT-001 | The system shall accept document uploads up to 500 MB per file via resumable multipart upload directly to the S3 quarantine bucket using pre-signed URLs. | M |
| FR-VLT-002 | Every uploaded object shall pass the quarantine pipeline: ClamAV scan → magic-byte file-type validation → SHA-256 hash recorded → promote to the vault bucket, or reject with reason. No object is downloadable before promotion. | M |
| FR-VLT-003 | The system shall create a `Document` with an initial `DocumentVersion` on successful promotion; every subsequent upload to the same `Document` creates a new immutable `DocumentVersion` with hash, size, uploader, and timestamp. | M |
| FR-VLT-004 | The system shall allow users to view version history, download any prior version, and restore a prior version (restore creates a new head version; nothing is destroyed). | M |
| FR-VLT-005 | The system shall classify each document into exactly one `DocumentCategory` drawn from the canonical enum (`LIVING_WILL, LAST_WILL, POWER_OF_ATTORNEY, MEDICAL_DIRECTIVE, INSURANCE, PASSPORT, IDENTITY_DOCUMENT, MARRIAGE_CERTIFICATE, BIRTH_CERTIFICATE, TRUST, PROPERTY, VEHICLE_REGISTRATION, BUSINESS, EMPLOYMENT_CONTRACT, FUNERAL_INSTRUCTIONS, EMERGENCY_CONTACTS, PASSWORD_REFERENCE, CRYPTO_RECOVERY, MEDICAL_RECORD, TAX, OTHER`), proposed by AI (FR-AI-001) and confirmable/overridable by the user. | M |
| FR-VLT-006 | The system shall run OCR (Textract; Tesseract worker fallback) on promoted PDF/image documents in the Standard encryption tier and index extracted text for search. OCR shall never run on Client-Encrypted Vault documents. | M |
| FR-VLT-007 | The system shall support user-defined `Tag` entities (create, assign, remove, rename) and filtering by tag, category, date range, and file type. | M |
| FR-VLT-008 | The system shall provide full-text search across document titles, metadata, OCR text, and tags, scoped strictly to documents the caller is authorized to read. | M |
| FR-VLT-009 | The system shall support per-document opt-in to the Client-Encrypted Vault: client-side AES-256-GCM encryption in the browser, key never transmitted, AI/OCR/preview disabled for the object, recovery via Shamir secret-sharing among user-nominated trustees (threshold configurable, default 2-of-3). | M |
| FR-VLT-010 | The system shall render in-browser previews (PDF, common image formats, plain text) for Standard-tier documents without requiring download. | S |
| FR-VLT-011 | The system shall support soft delete to a trash area with 30-day recovery, after which hard deletion of DB rows and S3 objects (including versions) occurs, unless a `LegalHold` applies. | M |
| FR-VLT-012 | The system shall enforce per-plan storage quotas and document-count limits, rejecting uploads over quota with a clear problem+json error and upgrade prompt. | M |
| FR-VLT-013 | The system shall record structured metadata per document (title, description, category, issue/expiry dates, issuer, jurisdiction, related persons) with expiry dates feeding the `Reminder` engine. | M |
| FR-VLT-014 | Signed and legally significant documents shall be written to S3 with Object Lock (compliance mode) so that stored versions cannot be altered or deleted for the configured retention period. | M |
| FR-VLT-015 | The system shall support bulk upload (up to 50 files per batch) with per-file quarantine status reporting. | S |
| FR-VLT-016 | The system shall allow a document to be linked to `Beneficiary`/`Executor` records ("relevant to" relationships) to drive estate readiness scoring. | C |
| FR-VLT-017 | The system shall detect duplicate uploads by SHA-256 hash within a vault and warn the user before creating a duplicate `Document`. | C |

**Acceptance criteria (vault, representative):**
- FR-VLT-001/002: Given a 500 MB PDF, when uploaded over an unstable connection, then multipart resume completes the transfer, the object lands in quarantine, and within 5 minutes (p95) it is either promoted (clean) or rejected (infected/invalid) with the user notified either way; an EICAR test file is always rejected and quarantined-deleted.
- FR-VLT-003: Given an existing `Document`, when a new file is uploaded to it, then a new `DocumentVersion` with incremented version number, new SHA-256, and uploader identity exists, and the prior version remains downloadable byte-identical (hash verified).
- FR-VLT-006: Given a scanned insurance policy image, when promotion completes, then OCR text is searchable within 10 minutes (p95) and a search for a phrase on the page returns the document.
- FR-VLT-009: Given a Client-Encrypted document, when any server-side process (OCR, AI, preview, admin tooling) touches the object, then only ciphertext is available; automated tests assert no plaintext ever reaches the backend.
- FR-VLT-011: Given a trashed document past 30 days with no `LegalHold`, when the purge job runs, then DB rows and all S3 object versions are deleted and a purge `AuditEvent` (metadata only) is retained.

### 3.3 Sharing context (`sharing`)

| ID | Requirement | Priority |
|---|---|---|
| FR-SHR-001 | The system shall allow a vault owner to create a `DocumentShare` granting a named registered user view or download permission on specific documents, with optional expiry. | M |
| FR-SHR-002 | The system shall allow creation of a `SecureLink` for a document or document set: unguessable token (≥ 128 bits entropy), optional password, mandatory expiry (default 7 days, max 90), optional download limit, optional email-OTP verification of the recipient. | M |
| FR-SHR-003 | The system shall generate a QR code for any `SecureLink` for printing or display (e.g., wallet card for emergency responders). | M |
| FR-SHR-004 | The system shall allow the owner to revoke any `DocumentShare` or `SecureLink` immediately; revoked links return 410 Gone and no content. | M |
| FR-SHR-005 | The system shall record every share access (who/what/when/IP/user-agent) as `AuditEvent`s visible to the owner in the activity timeline. | M |
| FR-SHR-006 | The system shall support access requests: an authorized professional (e.g., `FINANCIAL_ADVISER`, `LAWYER`) may request access to a named user's specific document category; the owner approves or denies; approval creates a `DocumentShare`. | M |
| FR-SHR-007 | Shared views shall apply a dynamic visible watermark (recipient identity + timestamp) on previews for view-only shares. | S |
| FR-SHR-008 | The system shall notify the owner on first access of each `SecureLink` and on share expiry. | S |
| FR-SHR-009 | The system shall prevent sharing of Client-Encrypted Vault documents via server-rendered preview; such documents may only be shared by explicit re-encryption to the recipient initiated client-side (Could) or excluded from sharing (default). | S |
| FR-SHR-010 | The system shall allow shares scoped to an `Organisation` (e.g., a law firm) so any authorized `OrganisationMember` with a matching role can access, with per-member audit. | S |
| FR-SHR-011 | The system shall cap anonymous secure-link preview to view-only unless download is explicitly enabled at link creation. | M |

**Acceptance criteria (sharing, representative):**
- FR-SHR-002: Given a secure link with a 24-hour expiry and password, when accessed after expiry or with a wrong password 5 times, then access is denied (410 / 429 respectively) and the owner is notified of repeated failures.
- FR-SHR-004: Given an active link being viewed by a recipient, when the owner revokes it, then any new request (including range/download continuation requests) fails within 60 seconds.
- FR-SHR-006: Given a pending access request, when the owner denies it, then the requester is notified without revealing vault contents or document existence beyond the requested category.

### 3.4 Estate context (`estate`)

| ID | Requirement | Priority |
|---|---|---|
| FR-EST-001 | The system shall allow a vault owner to add, edit, and remove `Beneficiary` records (name, relationship, contact, optional linked `User`, allocation notes) with field-level encryption of contact PII. | M |
| FR-EST-002 | The system shall allow a vault owner to nominate one or more `Executor`s; nomination sends an invitation the nominee must accept (creating/linking a `User`) before the executor role is active on the vault. | M |
| FR-EST-003 | The system shall allow the owner to configure an emergency access policy per vault: approver set (minimum 2 parties), approval threshold, mandatory time delay (24 h – 30 days, default 72 h), and the document scope released on grant. | M |
| FR-EST-004 | The system shall allow an `EXECUTOR`, `DOCTOR`, or `HOSPITAL_ADMIN` to open an `EmergencyAccessRequest`, stating the reason (death, incapacity, medical emergency) and attaching evidence (e.g., death certificate, medical attestation). | M |
| FR-EST-005 | Emergency access shall always require multi-party approval + configured time delay + full audit + notification to the owner on every verified channel; the owner may veto during the delay window, which cancels the request. (Security invariant 6.) | M |
| FR-EST-006 | On approval threshold met and delay elapsed without veto, the system shall create an `EmergencyAccessGrant` releasing only the configured document scope, time-boxed (default 30 days, extendable by re-approval), with every access audited. | M |
| FR-EST-007 | Death verification workflow: evidence is reviewed by (a) a verifying professional (`DOCTOR` or `LAWYER` attestation) and (b) a platform reviewer (`SYSTEM_ADMIN` back-office queue) before an executor vault unlock proceeds; both verifications are recorded as `AuditEvent`s. | M |
| FR-EST-008 | Executor vault unlock: after verified death, the accepted `EXECUTOR` receives the owner-configured executor scope (default: `LAST_WILL`, `FUNERAL_INSTRUCTIONS`, `EMERGENCY_CONTACTS`, `INSURANCE`, plus any owner-added categories); Client-Encrypted documents are recoverable only via the Shamir trustee quorum. | M |
| FR-EST-009 | A medical emergency grant (living will retrieval) shall support an expedited path: `HOSPITAL_ADMIN`/`DOCTOR` request scoped strictly to `LIVING_WILL` and `MEDICAL_DIRECTIVE` categories, threshold per owner policy, minimum delay configurable down to 1 hour for this scope only, owner notified immediately. | M |
| FR-EST-010 | The system shall provide an estate readiness dashboard scoring vault completeness (key categories present, executor accepted, emergency policy configured, documents unexpired). | S |
| FR-EST-011 | The system shall support inactivity check-in ("proof of life"): configurable owner check-in cadence; missed check-ins trigger escalating owner notifications and may (owner opt-in) authorise executors to open an `EmergencyAccessRequest`, which still follows the full approval + delay workflow. | S |
| FR-EST-012 | Beneficiaries shall receive, upon an applicable grant, access strictly limited to documents the owner designated for them — never the whole vault by default. | M |

**Acceptance criteria (estate, representative):**
- FR-EST-005: Given a 2-of-3 approval policy with a 72 h delay, when 2 approvers approve, then the grant activates only after 72 h, the owner receives immediate notification on email + SMS/WhatsApp + push, and an owner veto at any point before activation cancels the request and notifies all parties.
- FR-EST-007: Given an executor unlock request with a death certificate attached, when the professional attestation exists but platform review is pending, then no access is granted; when both verifications complete, the unlock proceeds and every step appears in the hash-chained audit trail.
- FR-EST-009: Given an approved medical emergency grant, when the `DOCTOR` opens any document outside `LIVING_WILL`/`MEDICAL_DIRECTIVE`, then access is denied and an `AUTHZ_DENIED` audit event fires.

### 3.5 Signature context (`signature`)

| ID | Requirement | Priority |
|---|---|---|
| FR-SIG-001 | The system shall allow an owner (or professional on the owner's behalf) to create a `SignatureRequest` on a document version, specifying signers (email or existing users), signing order (parallel or sequential), and a message. | M |
| FR-SIG-002 | The signing ceremony shall verify signer identity: authenticated session, or for external signers email OTP plus optional SMS OTP; identity evidence is captured in the evidence bundle. | M |
| FR-SIG-003 | The ceremony shall support draw, type, and upload signature marks, and shall present the exact document version (hash displayed) with mandatory scroll-through/acknowledgement before signing. | M |
| FR-SIG-004 | On completion, the system shall create a `Signature` with cryptographic seal: SHA-256 digest of the signed version, RFC 3161 trusted timestamp, signer identity assertion, device/IP/user-agent evidence bundle, and consent text version. | M |
| FR-SIG-005 | The sealed artefact (signed rendition + evidence certificate) shall be stored under S3 Object Lock (compliance mode) and any tampering shall be detectable by hash verification. | M |
| FR-SIG-006 | The system shall provide a public verification endpoint: given a completed signature's verification code, it confirms document hash, timestamp, and signer assertions without exposing document content. | S |
| FR-SIG-007 | For any `LAST_WILL` document, the signing UI shall display the mandatory Wills Act notice: electronic signature does not constitute valid execution of a will under the SA Wills Act 7 of 1953; wet-ink signature with witnesses is required; DLV stores the evidence record only. Acknowledgement is required and recorded. | M |
| FR-SIG-008 | Signers shall be able to decline with a reason; decline cancels sequential downstream steps and notifies the requester. | M |
| FR-SIG-009 | Signature requests shall expire (default 14 days, configurable 1–90) with reminders at 50% and 90% of the window. | S |
| FR-SIG-010 | No external e-signature provider is integrated at launch; a provider integration point is reserved in the `signature` context (DocuSign explicitly deferred). | W |

**Acceptance criteria (signature, representative):**
- FR-SIG-004: Given a completed ceremony, when the evidence certificate is generated, then it contains the document SHA-256, an RFC 3161 timestamp token verifiable against the TSA certificate, and the signer identity evidence; recomputing the stored document's hash matches the sealed digest.
- FR-SIG-007: Given a document categorised `LAST_WILL`, when a signature request is created, then the Wills Act notice is displayed to requester and signer, and the ceremony cannot complete without recorded acknowledgement.

### 3.6 Notification context (`notification`)

| ID | Requirement | Priority |
|---|---|---|
| FR-NTF-001 | The system shall deliver notifications via email (AWS SES), SMS and WhatsApp (Twilio WhatsApp Business API), and web push (PWA), per user channel preferences, as `Notification` records. | M |
| FR-NTF-002 | Security-critical notifications (new device login, password/2FA change, emergency access request, share of sensitive categories) shall ignore opt-outs and deliver on all verified channels. | M |
| FR-NTF-003 | The system shall support `Reminder`s tied to document expiry dates (e.g., passport, insurance renewal) with configurable lead times (default 90/30/7 days). | M |
| FR-NTF-004 | The system shall support recurring review reminders (e.g., "review your will annually") configurable per document or category. | S |
| FR-NTF-005 | Notification templates shall be centrally managed, localisable (English at launch; enum-driven i18n keys), and rendered server-side; no user PII in push payloads beyond display necessity. | M |
| FR-NTF-006 | Delivery shall be asynchronous via BullMQ with retry/backoff and a dead-letter queue; delivery status (queued/sent/delivered/failed) is recorded per `Notification`. | M |
| FR-NTF-007 | Users shall have an in-app notification centre listing all notifications with read/unread state. | S |
| FR-NTF-008 | Digest mode shall batch non-critical notifications into a daily email digest when selected. | C |

**Acceptance criteria (notification, representative):**
- FR-NTF-002: Given a user who disabled all marketing and activity emails, when an `EmergencyAccessRequest` is opened on their vault, then email + SMS/WhatsApp + push are all attempted within 60 seconds and delivery statuses are recorded.
- FR-NTF-003: Given a passport with expiry 2026-12-01 and default lead times, when the daily reminder job runs on 2026-09-02, then a 90-day reminder is created and delivered on the user's preferred channels.

### 3.7 Billing context (`billing`)

| ID | Requirement | Priority |
|---|---|---|
| FR-BIL-001 | The system shall define `Plan` records for Free, Premium (individual), Family, Professional, and Enterprise tiers with feature flags and quotas (storage, documents, members, signature requests, API access). | M |
| FR-BIL-002 | The system shall create and manage `Subscription`s via Stripe: checkout, upgrades (immediate, prorated), downgrades (effective end of period), cancellation (end of period), reactivation. ZAR primary; USD/EUR supported. | M |
| FR-BIL-003 | The system shall consume Stripe webhooks (signature-verified) to reconcile subscription state, invoice payment success/failure, and dunning events; webhook processing is idempotent. | M |
| FR-BIL-004 | On payment failure, the system shall apply a grace period (14 days) with dunning notifications; after grace, the account enters read-only mode (documents readable/downloadable, no uploads/shares/signatures) — data is never deleted for non-payment. | M |
| FR-BIL-005 | The system shall expose the Stripe billing portal for self-service payment method and invoice management. | M |
| FR-BIL-006 | Downgrades that violate quotas shall keep existing data read-only above quota rather than deleting anything; the user is prompted to reduce usage or re-upgrade. | M |
| FR-BIL-007 | Enterprise/organisation billing shall support seat-based pricing, a single consolidated invoice per `Organisation`, and VAT-compliant invoices (SA VAT number, 15%). | S |
| FR-BIL-008 | The system shall support promotional codes and a 14-day Premium trial without card capture. | C |
| FR-BIL-009 | All monetary values shall be stored as integer minor units with ISO 4217 currency code. | M |

**Acceptance criteria (billing, representative):**
- FR-BIL-002: Given a Premium monthly subscriber upgrading to Family, when checkout completes, then Stripe proration applies, the `Subscription` reflects the new `Plan` within 60 seconds of the webhook, and new quotas take effect immediately.
- FR-BIL-004: Given a failed renewal, when 14 days elapse without payment, then the account switches to read-only, the user retains full download access, and no document is deleted.

### 3.8 Audit context (`audit`)

| ID | Requirement | Priority |
|---|---|---|
| FR-AUD-001 | The system shall record an `AuditEvent` for every security-relevant action (authn/authz, document lifecycle, share lifecycle, estate workflow steps, signature steps, admin actions, billing changes, API key/webhook changes, exports). | M |
| FR-AUD-002 | Audit events shall be append-only and hash-chained: each event includes the SHA-256 of the previous event; chain verification is runnable on demand. (Security invariant 4.) | M |
| FR-AUD-003 | Audit events shall be exported continuously to S3 with Object Lock (compliance mode) for tamper-proof retention. | M |
| FR-AUD-004 | Vault owners shall see an activity timeline of events concerning their vault (served via the GraphQL read API). | M |
| FR-AUD-005 | `AUDITOR` role shall have read-only access to platform-wide audit trails, filterable by actor, resource, event type, and time range, with export to CSV/JSON. | M |
| FR-AUD-006 | Audit events shall never contain document plaintext or decrypted PII; they reference resources by UUID and record metadata only. | M |
| FR-AUD-007 | The system shall retain audit events per §6 retention schedule and prove chain integrity across retention boundaries (chain checkpoints). | M |
| FR-AUD-008 | Emergency access and executor unlock flows shall produce a complete, human-readable audit narrative exportable as a sealed PDF report for courts/Masters' offices. | S |

**Acceptance criteria (audit, representative):**
- FR-AUD-002: Given any attempt to update or delete an audit row at the DB level, then it fails (no UPDATE/DELETE grants; trigger-enforced), and given a tampered exported file, then chain verification reports the exact break point.

### 3.9 AI context (`ai`)

| ID | Requirement | Priority |
|---|---|---|
| FR-AI-001 | The system shall propose a `DocumentCategory` (from the canonical enum) and suggested `Tag`s for each promoted Standard-tier document using the `AiGateway` (Anthropic Claude API); the user confirms or overrides; confidence is displayed. | M |
| FR-AI-002 | The system shall generate a plain-language summary of Standard-tier documents on demand, clearly labelled as AI-generated and not legal advice. | S |
| FR-AI-003 | The system shall support natural-language search ("show me my car insurance that expires this year") translated to structured queries over the caller's authorized documents only. | S |
| FR-AI-004 | The system shall generate estate-readiness recommendations (missing categories, stale documents, unconfigured emergency policy). | S |
| FR-AI-005 | The AI shall never receive Client-Encrypted Vault content; the `AiGateway` enforces this at the boundary with automated tests. (Canonical decision 8.) | M |
| FR-AI-006 | The `AiGateway` shall abstract the model provider so models can be swapped without touching consuming contexts; per-call metadata (model, tokens, latency) is logged without content. | M |
| FR-AI-007 | Users shall be able to disable AI processing vault-wide; when disabled, classification falls back to manual selection. | M |
| FR-AI-008 | AI outputs shall carry provenance metadata (model version, prompt template version, timestamp) stored with the suggestion. | S |
| FR-AI-009 | Document content sent to the AI provider shall be limited to the minimum necessary excerpt/OCR text, never raw binaries where avoidable, and is not used for provider training (contractual control). | M |

### 3.10 Admin context (`admin`)

| ID | Requirement | Priority |
|---|---|---|
| FR-ADM-001 | `SYSTEM_ADMIN` shall be able to search and view account metadata (never document content), suspend/unsuspend accounts with reason codes, and adjust quotas. | M |
| FR-ADM-002 | Account suspension shall immediately revoke all sessions, disable API keys, block logins and secure links, and notify the owner; documents are preserved. | M |
| FR-ADM-003 | `SUPER_ADMIN` actions (role grants for platform roles, legal hold placement/release, break-glass access) shall require dual control: a second `SUPER_ADMIN` approval before execution. | M |
| FR-ADM-004 | The system shall support `LegalHold` placement on a user, vault, or document set: holds block hard deletion and purges until released; placement/release is dual-controlled and audited. | M |
| FR-ADM-005 | `SUPPORT_AGENT` access to a user account shall require explicit, time-boxed user consent (default 24 h) and shall never expose document content or decrypted PII. | M |
| FR-ADM-006 | The back-office shall provide the death-verification review queue (FR-EST-007) with evidence viewing, approve/reject, and mandatory review notes. | M |
| FR-ADM-007 | The back-office shall manage feature flags per environment/plan/user cohort. | S |
| FR-ADM-008 | The back-office shall surface operational dashboards: quarantine failures, webhook failures, dunning queue, emergency-access requests in flight. | S |

### 3.11 Integration context (`integration`)

| ID | Requirement | Priority |
|---|---|---|
| FR-INT-001 | `COMPANY_ADMIN` shall be able to create, rotate, and revoke `ApiKey`s scoped to their `Organisation` with named scopes (read-documents, manage-shares, read-audit, etc.); keys are shown once and stored hashed. | M |
| FR-INT-002 | The public REST API (`/api/v1`, OpenAPI 3.1) shall expose organisation-scoped operations: document upload (through the same quarantine pipeline), metadata read, share creation, audit read — all subject to the same ABAC policies as the UI. | M |
| FR-INT-003 | The system shall support `Webhook` subscriptions per organisation for outbound events (document.promoted, share.accessed, signature.completed, emergencyaccess.granted, subscription.updated) with HMAC-SHA256 payload signing, retries with exponential backoff, and automatic disable after sustained failure (with notification). | M |
| FR-INT-004 | API rate limits shall apply per key and per organisation plan tier, returning 429 with Retry-After; limits are documented in the OpenAPI spec. | M |
| FR-INT-005 | The GraphQL endpoint (`/graphql`) shall serve read-heavy dashboard/timeline queries with persisted queries in production and depth/complexity limits. | M |
| FR-INT-006 | All POST endpoints shall accept idempotency keys; replays return the original result. | M |
| FR-INT-007 | Partner API onboarding (hospitals, law firms) shall include sandbox keys against the staging environment. | S |

---

## 4. Non-functional requirements

### 4.1 Performance (NFR-PRF)

| ID | Requirement |
|---|---|
| NFR-PRF-001 | API read endpoints: p95 ≤ 300 ms, p99 ≤ 800 ms at nominal load (excluding file transfer). |
| NFR-PRF-002 | API write endpoints (non-upload): p95 ≤ 500 ms, p99 ≤ 1,200 ms. |
| NFR-PRF-003 | Search queries: p95 ≤ 700 ms over a vault of 10,000 documents. |
| NFR-PRF-004 | File uploads up to 500 MB supported via resumable multipart; time-to-first-byte for pre-signed URL issuance p95 ≤ 400 ms; upload throughput bounded by client bandwidth, not platform. |
| NFR-PRF-005 | Quarantine pipeline completion (scan + validate + promote) p95 ≤ 5 min for files ≤ 500 MB. |
| NFR-PRF-006 | Web app: LCP ≤ 2.5 s and INP ≤ 200 ms on the dashboard at p75 on a mid-range device. |
| NFR-PRF-007 | GraphQL timeline query p95 ≤ 500 ms for 90 days of events. |

### 4.2 Availability & disaster recovery (NFR-AVL)

| ID | Requirement |
|---|---|
| NFR-AVL-001 | Service availability target 99.9% monthly (excluding announced maintenance ≤ 4 h/month). |
| NFR-AVL-002 | RDS Multi-AZ automatic failover ≤ 2 min; stateless services on EKS across ≥ 3 AZs. |
| NFR-AVL-003 | DR: eu-west-1 warm standby via S3 CRR and cross-region DB snapshots. RPO ≤ 15 min, RTO ≤ 4 h; DR runbook exercised at least twice yearly. |
| NFR-AVL-004 | Emergency-access read path (living will retrieval) is priority-tiered: it must remain available in degraded mode (read-only) during partial outages. |

### 4.3 Scalability (NFR-SCL)

| ID | Requirement |
|---|---|
| NFR-SCL-001 | Support 100,000 registered users and 5,000 concurrent sessions at launch scale without architecture change; horizontal pod autoscaling on EKS. |
| NFR-SCL-002 | Storage design supports 50 TB aggregate document storage with lifecycle tiering to Glacier. |
| NFR-SCL-003 | Queue-based workloads (OCR, AI, notifications, scans) scale workers independently via BullMQ concurrency and KEDA-style scaling on queue depth. |
| NFR-SCL-004 | Database: read replicas for GraphQL read models; no single tenant exceeds noisy-neighbour thresholds (per-tenant rate limits). |

### 4.4 Security (NFR-SEC) — restates PROJECT_MEMORY §7 invariants as testable requirements

| ID | Requirement |
|---|---|
| NFR-SEC-001 | All data encrypted at rest (AES-256) and in transit (TLS 1.3 only; HSTS preloaded; no TLS 1.2 fallback). |
| NFR-SEC-002 | Envelope encryption: per-document DEK (AES-256-GCM) wrapped by KMS CMK; per-tenant key hierarchy; annual + on-demand rotation with re-wrap jobs. |
| NFR-SEC-003 | Field-level encryption for PII columns: ID numbers, crypto recovery references, emergency contacts. |
| NFR-SEC-004 | Audit events append-only (Postgres + S3 Object Lock export) and hash-chained (SHA-256 of previous event). |
| NFR-SEC-005 | Every uploaded object passes quarantine → ClamAV → magic-byte validation → SHA-256 recorded → promote. |
| NFR-SEC-006 | Emergency access always requires multi-party approval + time delay + full audit + owner notification. |
| NFR-SEC-007 | No secrets in code or env files; AWS Secrets Manager only; secret rotation supported. |
| NFR-SEC-008 | Deny-by-default authorization; every endpoint carries an explicit CASL policy; CI fails if an endpoint lacks one. |
| NFR-SEC-009 | OWASP ASVS L2 verification target; independent penetration test before GA and annually thereafter. |
| NFR-SEC-010 | Edge protection: CloudFront + WAF managed rules + Shield; GuardDuty, Security Hub, and Inspector enabled in all accounts. |
| NFR-SEC-011 | Session security: JWT access 15 min RS256/JWKS; refresh rotation with family revocation on reuse; httpOnly, Secure, SameSite cookies. |
| NFR-SEC-012 | Client-Encrypted Vault: server never receives keys or plaintext; verified by automated boundary tests. |

### 4.5 Compliance (NFR-CMP)

| ID | Requirement |
|---|---|
| NFR-CMP-001 | POPIA: lawful processing records, purpose limitation, Information Officer registration, data subject request (access/correction/deletion/objection) fulfilment within statutory timelines, operator agreements with sub-processors. |
| NFR-CMP-002 | GDPR-ready: lawful bases mapped, DPA templates, SCCs for cross-border transfer (af-south-1 ↔ eu-west-1), Article 15–22 data subject rights tooling, 72-hour breach notification runbook. |
| NFR-CMP-003 | ISO 27001 alignment: ISMS control mapping maintained; Statement of Applicability kept current. |
| NFR-CMP-004 | SOC 2 Type II is a certification target (not a launch blocker): evidence collection automated from day one. |
| NFR-CMP-005 | HIPAA-ready architecture: technical safeguards (access control, audit, integrity, transmission security) satisfied; BAAs executed only if/when US healthcare customers onboard. |
| NFR-CMP-006 | ECTA: signature ceremonies meet advanced electronic signature evidentiary requirements (signer identification, sole control, tamper evidence). |
| NFR-CMP-007 | Wills Act 7 of 1953: mandatory UI disclosures wherever wills are uploaded, drafted, or signed (see FR-SIG-007); marketing and product copy must never claim electronic will execution. |
| NFR-CMP-008 | Data residency: SA customer data primary in af-south-1; replication to eu-west-1 documented as a transfer with appropriate safeguards. |

### 4.6 Accessibility (NFR-ACC)

| ID | Requirement |
|---|---|
| NFR-ACC-001 | WCAG 2.2 AA conformance across all user-facing surfaces, including the signing ceremony, secure-link redemption, and emergency access flows. |
| NFR-ACC-002 | Full keyboard operability; visible focus; no keyboard traps (including PDF preview and signature draw pad, which must offer type-to-sign as the accessible alternative). |
| NFR-ACC-003 | Automated a11y checks (axe) in CI plus manual screen-reader testing (NVDA, VoiceOver) per release for critical flows. |
| NFR-ACC-004 | Language: plain-language patterns for legal concepts; reading-level review for estate flows. |

### 4.7 Maintainability (NFR-MNT)

| ID | Requirement |
|---|---|
| NFR-MNT-001 | TypeScript 5.x strict everywhere; lint/format gates in CI; Conventional Commits; trunk-based branching with release tags `vX.Y.Z`. |
| NFR-MNT-002 | Test coverage: ≥ 80% unit on domain logic; contract tests for REST (OpenAPI) and GraphQL schemas; E2E happy paths for the 15 critical use cases (see use-cases.md). |
| NFR-MNT-003 | Bounded contexts remain independently deployable NestJS modules with no cross-context DB joins; inter-context communication via domain events or explicit APIs. |
| NFR-MNT-004 | Database migrations via Prisma Migrate, forward-only in prod, rehearsed on staging. |
| NFR-MNT-005 | All infrastructure changes via Terraform PRs; no console changes in prod (detected via drift checks). |

### 4.8 Observability (NFR-OBS)

| ID | Requirement |
|---|---|
| NFR-OBS-001 | Structured JSON logs with correlation IDs propagated end-to-end (frontend request ID → API → queues); no PII/document content in logs. |
| NFR-OBS-002 | Metrics (RED + USE) and distributed traces exported to CloudWatch; SLO dashboards for NFR-PRF/NFR-AVL targets with burn-rate alerts. |
| NFR-OBS-003 | On-call alerting for: quarantine backlog, webhook failure rate, Stripe webhook lag, audit-chain verification failure (page immediately), emergency-access path errors (page immediately). |
| NFR-OBS-004 | Synthetic probes for login, upload initiation, secure-link redemption, and living-will retrieval every 5 minutes from two geographies. |

---

## 5. External interface requirements

### 5.1 User interfaces

- Responsive Next.js 15 PWA (installable; offline shell with read-only cached metadata, never cached document plaintext).
- Key surfaces: onboarding/registration, vault dashboard, document detail (versions, shares, signatures, timeline), estate centre (beneficiaries, executors, emergency policy), signing ceremony, notification centre, billing portal handoff, org console, platform back-office, auditor console.
- All surfaces meet WCAG 2.2 AA (NFR-ACC).

### 5.2 Software interfaces

| Interface | Direction | Protocol/format | Notes |
|---|---|---|---|
| REST API `/api/v1` | Inbound | HTTPS, JSON, OpenAPI 3.1, RFC 9457 errors, cursor pagination, idempotency keys | Primary write/integration contract |
| GraphQL `/graphql` | Inbound | HTTPS, GraphQL (Apollo), persisted queries in prod | Read-heavy dashboards/timelines |
| Webhooks | Outbound | HTTPS POST, JSON, HMAC-SHA256 signature, retries | Per-organisation subscriptions |
| Stripe | Both | Stripe API + signed webhooks | Billing, checkout, billing portal |
| AWS SES | Outbound | SES API | |
| Twilio | Outbound | Twilio API (SMS + WhatsApp Business API) | |
| Anthropic Claude API | Outbound | Via `AiGateway` abstraction only | Provider-swappable; no Client-Encrypted content |
| Amazon Textract | Outbound | Async job API | Fallback: self-hosted Tesseract worker |
| RFC 3161 TSA | Outbound | Timestamp protocol | Signature seals |
| ClamAV | Internal | Scan service in quarantine pipeline | |
| WebAuthn | Inbound | Browser API / FIDO2 | Passkeys |

### 5.3 Hardware interfaces

None beyond commodity client devices; platform authenticators (Touch ID, Windows Hello, Android biometrics) and roaming FIDO2 keys are used via WebAuthn.

### 5.4 Communications interfaces

TLS 1.3 only for all external traffic; mTLS or VPC-private networking for internal service-to-service traffic; SES with SPF/DKIM/DMARC enforced on sending domains.

---

## 6. Data retention and deletion requirements

| ID | Requirement |
|---|---|
| DRR-001 | Active documents: retained while the account is active and paid or within free-tier quota; never deleted for non-payment (read-only mode instead, FR-BIL-004). |
| DRR-002 | Trash: 30-day soft-delete recovery window, then hard purge of DB rows and all S3 versions unless a `LegalHold` applies. |
| DRR-003 | Signed/legal artefacts under S3 Object Lock (compliance mode): retention 7 years from sealing (assumption aligned to SA evidentiary practice); Object Lock prevents earlier deletion even by administrators. |
| DRR-004 | Audit events: 7-year retention (Postgres hot 18 months, then Object Lock S3 archive); chain checkpoints preserved across tiers. |
| DRR-005 | Account deletion (POPIA/GDPR erasure): user-initiated deletion triggers a 14-day cooling-off, then purges documents, PII, and derived data (OCR text, AI outputs, search indexes); retained exceptions: sealed signature artefacts under Object Lock, audit metadata (pseudonymised actor reference), and billing records required by tax law (5 years, SARS). Exceptions are disclosed in the privacy policy. |
| DRR-006 | Deceased-owner vaults: retained for the estate administration period; executor may export; vault purges 24 months after estate closure confirmation (executor-attested) unless a `LegalHold` applies. |
| DRR-007 | Backups: encrypted snapshots retained 35 days; purged data ages out of backups within that window; restore procedures re-apply deletions recorded in a tombstone log. |
| DRR-008 | Notification/OTP artefacts: message bodies purged after 90 days; delivery metadata retained 18 months. |
| DRR-009 | Data subject export (POPIA/GDPR access): machine-readable export (JSON + original files) delivered within statutory timelines via a secure, expiring download. |

---

## 7. Constraints, assumptions, and dependencies

### 7.1 Constraints

1. Wet-signature caveat (binding): DLV must not present itself as executing legally valid SA wills electronically. Electronic signatures apply to directives, mandates, and consent artefacts (ECTA AES); for wills, DLV is the secure repository, drafting assistant, and evidence-preservation layer.
2. Stack and infrastructure are locked per PROJECT_MEMORY §3; deviations require a PROJECT_MEMORY change first.
3. Full zero-knowledge encryption is not offered platform-wide; the tiered encryption model (Standard + Client-Encrypted Vault) is the fixed design.
4. af-south-1 service gaps (e.g., Textract availability) are handled by the documented fallbacks, not by moving primary data out of region.

### 7.2 Stated assumptions (no TBDs)

| # | Assumption |
|---|---|
| A-01 | Signed-artefact and audit retention of 7 years is adopted pending formal legal review; it aligns with common SA evidentiary and FICA-adjacent practice. |
| A-02 | Death verification is manual-first (professional attestation + platform review); Home Affairs integration is a future enhancement, not assumed available. |
| A-03 | The 14-day dunning grace period and read-only-on-lapse policy are product decisions adopted here. |
| A-04 | Default emergency-access delay 72 h (min 24 h, max 30 days; medical living-will scope may reduce to 1 h) is adopted as the launch policy envelope. |
| A-05 | English is the launch language; i18n scaffolding is built in (isiZulu, Afrikaans candidates post-launch). |
| A-06 | Launch scale target (100k users, 50 TB) is a planning assumption for capacity, not a contractual commitment. |
| A-07 | Trial length (14 days, no card) and quota values per plan are defined in the PRD and may be tuned pre-launch without SRS change, provided FR-BIL-001 flags/quotas remain configuration-driven. |

### 7.3 Dependencies

Stripe, AWS (af-south-1/eu-west-1 service availability), Twilio (WhatsApp Business API approval), Anthropic Claude API, RFC 3161 TSA provider, ClamAV signature feed currency.

---

*End of SRS v1.0.0 — conforms to PROJECT_MEMORY.md (2026-07-05).*
