# User Stories

## Digital Legacy Vault (DLV)

| Field | Value |
|---|---|
| Document | User Stories |
| Product | Digital Legacy Vault (DLV) |
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Architecture Team |
| Canonical source | `PROJECT_MEMORY.md` (roles, entities, enums used verbatim) |

Priorities: MoSCoW (**M**ust / **S**hould / **C**ould / **W**on't this release). Story IDs are stable; traceability to SRS FR IDs is noted where direct.

---

## 1. GUEST (unauthenticated visitor)

### US-001 — Register with email (M) *(FR-IDN-001/002)*
As a `GUEST`, I want to register with my email and a password so that I get my own secure vault.
- **Given** a valid email and a password meeting policy (≥12 chars, zxcvbn ≥ 3, not breached), **when** I submit registration, **then** a `User`, default `Vault`, and `Consent` records are created and a verification email arrives within 60 seconds.
- **Given** I have not clicked the verification link, **when** I try to log in, **then** I am prompted to verify first and can resend the link.
- **Given** a verification link older than 24 hours, **when** I click it, **then** it is rejected and a fresh link is offered.

### US-002 — Register with a passkey (M) *(FR-IDN-003)*
As a `GUEST`, I want to create my account with a passkey instead of a password so that my vault is phishing-resistant from day one.
- **Given** a WebAuthn-capable browser, **when** I choose "Continue with passkey" during registration, **then** a `Device` record with credential metadata is created and no password is required.
- **Given** an unsupported browser, **when** I choose passkey registration, **then** I see a clear fallback to password + TOTP.

### US-003 — Open a secure link (M) *(FR-SHR-002/011)*
As a `GUEST`, I want to open a secure link that was shared with me so that I can view the document without creating an account.
- **Given** a valid, unexpired `SecureLink` with a password, **when** I enter the correct password, **then** I see a view-only, watermarked preview and the owner's timeline records my access.
- **Given** an expired or revoked link, **when** I open it, **then** I receive a 410 Gone page with no document metadata revealed.

### US-004 — Understand the Wills Act position (M) *(NFR-CMP-007)*
As a `GUEST`, I want the marketing and onboarding pages to explain clearly that a valid SA will still needs a wet-ink signature with witnesses so that I don't over-rely on the platform.
- **Given** any page describing wills features, **when** I read it, **then** the wet-signature caveat is present and DLV is described as the secure repository, drafting assistant, and evidence-preservation layer.

---

## 2. REGISTERED_USER (free tier vault owner)

### US-005 — Log in with password + TOTP (M) *(FR-IDN-004/006)*
As a `REGISTERED_USER`, I want to log in with my password and a TOTP code so that a stolen password alone cannot open my vault.
- **Given** TOTP is enrolled, **when** I log in with correct password and code, **then** I receive a 15-minute JWT access token and an httpOnly rotating refresh token.
- **Given** an incorrect TOTP code entered 5 times, **when** I try again, **then** the attempt is throttled and I am notified.

### US-006 — Enrol TOTP 2FA with recovery codes (M) *(FR-IDN-004)*
As a `REGISTERED_USER`, I want to enrol TOTP with a QR code and receive recovery codes so that I can still get in if I lose my phone.
- **Given** enrolment starts, **when** I scan the QR and confirm a valid code, **then** TOTP is active and exactly 10 single-use recovery codes are shown once.
- **Given** a used recovery code, **when** it is presented again, **then** it is rejected.

### US-007 — Add a passkey to an existing account (M) *(FR-IDN-003)*
As a `REGISTERED_USER`, I want to add a passkey to my account so that future logins are passwordless.
- **Given** an authenticated session with recent re-authentication, **when** I register a passkey, **then** it appears in my device list and works for the next login.

### US-008 — Manage sessions and devices (M) *(FR-IDN-008)*
As a `REGISTERED_USER`, I want to see all active sessions and devices and revoke any of them so that I can shut down suspicious access.
- **Given** two active sessions, **when** I revoke the other one, **then** its refresh token family is invalidated within 60 seconds and it cannot renew.

### US-009 — Reset a forgotten password (M) *(FR-IDN-011)*
As a `REGISTERED_USER`, I want to reset my password via an emailed link so that I can recover access safely.
- **Given** a reset link younger than 1 hour and unused, **when** I set a compliant new password, **then** all my sessions are invalidated and I am notified on all verified channels.

### US-010 — Upload my first document (M) *(FR-VLT-001/002/003)*
As a `REGISTERED_USER`, I want to upload a document (up to 500 MB) so that it is stored encrypted in my vault.
- **Given** a 200 MB PDF, **when** I upload it, **then** it enters quarantine, is scanned and validated, and appears in my vault as a `Document` with `DocumentVersion` v1 within 5 minutes (p95), with its SHA-256 recorded.
- **Given** an infected file (EICAR), **when** the scan completes, **then** the file is rejected, never downloadable, and I am told why.

### US-011 — Get an AI category suggestion (M) *(FR-AI-001, FR-VLT-005)*
As a `REGISTERED_USER`, I want the system to suggest what kind of document I uploaded so that filing takes seconds.
- **Given** a promoted insurance PDF, **when** classification runs, **then** `INSURANCE` is proposed from the canonical enum with a confidence indicator, and I can accept or pick another category.
- **Given** I override the suggestion, **when** I save, **then** my choice wins and the override is recorded.

### US-012 — Find text inside my scanned documents (M) *(FR-VLT-006/008)*
As a `REGISTERED_USER`, I want scanned documents OCR'd and searchable so that I can find things by their contents.
- **Given** a promoted scanned policy, **when** OCR completes (≤10 min p95), **then** searching a phrase from the page returns the document.
- **Given** a search, **when** results return, **then** they contain only documents I am authorized to read.

### US-013 — Organise with tags and filters (M) *(FR-VLT-007)*
As a `REGISTERED_USER`, I want to tag documents and filter by tag, category, and date so that my vault stays navigable.
- **Given** documents tagged "Mom", **when** I filter by that `Tag`, **then** only those documents are listed.

### US-014 — See and restore versions (M) *(FR-VLT-004)*
As a `REGISTERED_USER`, I want a version history for each document so that I never lose an older copy.
- **Given** a `Document` with 3 versions, **when** I restore v1, **then** a new v4 identical to v1 (hash-verified) becomes the head and v2/v3 remain downloadable.

### US-015 — Recover from trash (M) *(FR-VLT-011)*
As a `REGISTERED_USER`, I want deleted documents to sit in trash for 30 days so that a mistake isn't fatal.
- **Given** a document deleted 10 days ago, **when** I restore it, **then** it returns with all versions and tags intact.
- **Given** 30 days elapse and no `LegalHold` applies, **when** the purge job runs, **then** the document and all S3 versions are permanently deleted.

### US-016 — Record document expiry dates (M) *(FR-VLT-013, FR-NTF-003)*
As a `REGISTERED_USER`, I want to record expiry dates on documents like my passport so that I am reminded before they lapse.
- **Given** a `PASSPORT` expiring in 100 days with default lead times, **when** the 90-day threshold passes, **then** I receive a `Reminder` notification on my preferred channels.

### US-017 — Hit my free quota gracefully (M) *(FR-VLT-012)*
As a `REGISTERED_USER`, I want a clear message when I reach the free tier's 500 MB / 25-document limit so that I know my options.
- **Given** I am at quota, **when** I attempt an upload, **then** it is rejected with a problem+json error, the UI explains the limit, and an upgrade path is offered — nothing existing is deleted.

### US-018 — Share a document with a named person (M) *(FR-SHR-001)*
As a `REGISTERED_USER`, I want to share a specific document with another registered user so that they see exactly that and nothing else.
- **Given** a `DocumentShare` with view permission and 7-day expiry, **when** the recipient opens it, **then** they can view (watermarked) but not download, and my timeline shows their access.

### US-019 — Create a secure link with QR (M) *(FR-SHR-002/003)*
As a `REGISTERED_USER`, I want a password-protected, expiring secure link with a QR code so that I can hand access to someone without an account.
- **Given** link creation, **when** I set password, 7-day expiry, and a download limit of 3, **then** the link + QR are generated, and the 4th download attempt is refused.

### US-020 — Revoke a share instantly (M) *(FR-SHR-004)*
As a `REGISTERED_USER`, I want to revoke any share or link immediately so that I stay in control.
- **Given** an active `SecureLink`, **when** I revoke it, **then** new requests fail within 60 seconds with 410 Gone.

### US-021 — Nominate an executor (M) *(FR-EST-002)*
As a `REGISTERED_USER`, I want to nominate an executor who must accept the nomination so that the role is consciously taken up.
- **Given** I nominate my brother by email, **when** he accepts, **then** an active `Executor` record exists scoped to my `Vault` and both of us are notified; **given** he declines, **then** I am prompted to nominate someone else.

### US-022 — Add beneficiaries (M) *(FR-EST-001)*
As a `REGISTERED_USER`, I want to record beneficiaries with contact details so that the right people are connected to my estate documents.
- **Given** I add a `Beneficiary` with phone and ID number, **when** the record is stored, **then** PII fields are field-level encrypted and visible only to me.

### US-023 — Export my data (POPIA/GDPR) (M) *(DRR-009)*
As a `REGISTERED_USER`, I want to export everything I've stored so that I can exercise my data rights.
- **Given** an export request, **when** processing completes, **then** I receive a secure expiring download containing original files plus machine-readable metadata (JSON).

### US-024 — Delete my account (M) *(DRR-005)*
As a `REGISTERED_USER`, I want to delete my account and data so that my right to erasure is honoured.
- **Given** deletion is requested, **when** the 14-day cooling-off passes without cancellation, **then** documents, PII, and derived data are purged, with disclosed exceptions (sealed signatures under Object Lock, pseudonymised audit metadata, tax-required billing records).

### US-025 — Choose notification channels (S) *(FR-NTF-001/002)*
As a `REGISTERED_USER`, I want to choose email/SMS/WhatsApp/push per notification type so that I'm informed without being spammed.
- **Given** I disable non-critical emails, **when** a routine reminder fires, **then** it respects my preference; **when** an `EmergencyAccessRequest` is opened on my vault, **then** every verified channel is used regardless.

### US-026 — Start a Premium trial (C) *(FR-BIL-008)*
As a `REGISTERED_USER`, I want a 14-day Premium trial without a card so that I can evaluate paid features safely.
- **Given** trial start, **when** 14 days pass without subscribing, **then** I revert to Free with all data intact (read-only above quota).

---

## 3. PREMIUM_USER (paid individual)

### US-027 — Upgrade to Premium (M) *(FR-BIL-002)*
As a `REGISTERED_USER`, I want to subscribe to Premium in ZAR via Stripe so that I unlock full features.
- **Given** successful Stripe checkout, **when** the webhook is processed, **then** my `Subscription` is active on the Premium `Plan` within 60 seconds and quotas update immediately.

### US-028 — Manage billing in the portal (M) *(FR-BIL-005)*
As a `PREMIUM_USER`, I want a self-service billing portal so that I can change cards and download invoices without contacting support.
- **Given** an active subscription, **when** I open the billing portal, **then** I can update my payment method and download VAT invoices.

### US-029 — Downgrade without data loss (M) *(FR-BIL-006)*
As a `PREMIUM_USER`, I want downgrades to never delete my documents so that I can change plans without fear.
- **Given** I downgrade with 5 GB stored (over the free quota), **when** the downgrade takes effect at period end, **then** all documents remain readable/downloadable and uploads are blocked until under quota or re-upgraded.

### US-030 — Survive a failed payment (M) *(FR-BIL-004)*
As a `PREMIUM_USER`, I want a grace period and read-only fallback on payment failure so that my estate documents are never hostage to a card problem.
- **Given** a failed renewal, **when** 14 days pass unpaid, **then** my account becomes read-only (full download retained) and nothing is deleted.

### US-031 — Configure my emergency access policy (M) *(FR-EST-003)*
As a `PREMIUM_USER`, I want to define who can approve emergency access, the threshold, the delay, and the released scope so that access after death or incapacity follows my wishes exactly.
- **Given** I set 2-of-3 approvers, 72 h delay, and a scope of `LAST_WILL` + `FUNERAL_INSTRUCTIONS` + `INSURANCE`, **when** I save, **then** the policy is active, versioned, and confirmed to me on all channels.

### US-032 — Veto an emergency request (M) *(FR-EST-005)*
As a `PREMIUM_USER`, I want to veto any emergency access request during the delay window so that a false or premature claim cannot open my vault while I'm alive and able.
- **Given** an approved request in its 72 h delay, **when** I click "This is not legitimate — cancel", **then** the request is cancelled instantly, all parties are notified, and the full sequence is in the audit trail.

### US-033 — Protect a document with the Client-Encrypted Vault (M) *(FR-VLT-009)*
As a `PREMIUM_USER`, I want to encrypt my crypto seed phrase document client-side so that not even DLV can read it.
- **Given** I opt a `CRYPTO_RECOVERY` document into the Client-Encrypted Vault, **when** it is stored, **then** encryption (AES-256-GCM) happens in my browser, the key never leaves my custody, and OCR/AI/preview are disabled for it.
- **Given** opt-in, **when** I proceed, **then** I must nominate Shamir trustees (default 2-of-3) and acknowledge that key loss without trustee quorum means permanent loss.

### US-034 — Recover a client-encrypted document via trustees (M) *(FR-VLT-009)*
As a `PREMIUM_USER`, I want my nominated trustees to be able to reconstruct my key at the configured threshold so that my heirs aren't locked out forever.
- **Given** a 2-of-3 trustee configuration, **when** 2 trustees submit their shares in the recovery ceremony, **then** the key is reconstructed client-side and the document is decryptable; **when** only 1 share is submitted, **then** nothing decrypts.

### US-035 — Request a signature on a mandate (M) *(FR-SIG-001…004)*
As a `PREMIUM_USER`, I want to send a `POWER_OF_ATTORNEY` document for e-signature so that my mandate is executed with strong evidence.
- **Given** a `SignatureRequest` to two signers in sequence, **when** both complete the ceremony, **then** each `Signature` carries a SHA-256 digest, RFC 3161 timestamp, and identity/device evidence bundle, and the sealed artefact is stored under S3 Object Lock.

### US-036 — Be warned when e-signing a will (M) *(FR-SIG-007)*
As a `PREMIUM_USER`, I want an unmissable warning when signing anything categorised `LAST_WILL` so that I know the e-signature does not legally execute my will.
- **Given** a `LAST_WILL` signature ceremony, **when** it runs, **then** the Wills Act 7 of 1953 notice is displayed, requires explicit acknowledgement, and the acknowledgement is recorded in the evidence bundle.

### US-037 — Ask questions in natural language (S) *(FR-AI-003)*
As a `PREMIUM_USER`, I want to search like "which of my policies expire this year?" so that I don't need to remember filing details.
- **Given** the query, **when** results return, **then** they include only my authorized documents matching the intent, and Client-Encrypted documents never appear in content-based results.

### US-038 — Get a plain-language summary (S) *(FR-AI-002)*
As a `PREMIUM_USER`, I want an AI summary of a long policy so that I understand it quickly.
- **Given** a Standard-tier document, **when** I request a summary, **then** it is labelled AI-generated / not legal advice, with model provenance recorded.

### US-039 — See my estate readiness (S) *(FR-EST-010)*
As a `PREMIUM_USER`, I want a readiness score showing gaps (no executor accepted, no `LIVING_WILL`, expired ID) so that I know what to fix next.
- **Given** my vault lacks an accepted executor, **when** I view the dashboard, **then** that gap is listed with a one-click fix action.

### US-040 — Turn AI off (M) *(FR-AI-007)*
As a `PREMIUM_USER`, I want to disable AI processing for my entire vault so that no document content reaches an AI provider.
- **Given** AI is disabled, **when** I upload a document, **then** no `AiGateway` call occurs and I categorise manually.

### US-041 — Set an inactivity check-in (S) *(FR-EST-011)*
As a `PREMIUM_USER`, I want optional periodic "proof of life" check-ins so that prolonged silence can alert my executor.
- **Given** a 90-day cadence and 2 missed check-ins after escalating alerts, **when** the second window lapses, **then** my `Executor` is invited to open an `EmergencyAccessRequest` — which still requires the full approval + delay workflow.

### US-042 — Review my vault activity timeline (M) *(FR-AUD-004)*
As a `PREMIUM_USER`, I want a timeline of everything that happened in my vault so that I can trust and verify.
- **Given** a share was accessed yesterday, **when** I open the timeline, **then** I see who, what, when, and from where (IP/user-agent) for that event.

---

## 4. FAMILY_ADMIN

### US-043 — Create a family plan and invite members (M) *(FR-BIL-001/002, FR-IDN-010)*
As a `FAMILY_ADMIN`, I want to subscribe to the Family plan and invite up to 6 members so that the household is covered under one bill.
- **Given** an invitation email, **when** my spouse accepts, **then** her account joins the plan with her own private `Vault` and the pooled 100 GB quota applies.

### US-044 — See family coverage without seeing content (M)
As a `FAMILY_ADMIN`, I want a family overview (member joined, storage used, readiness status) without any access to members' document contents so that I can steward without snooping.
- **Given** the overview, **when** I view a member row, **then** I see aggregate stats only; **when** I attempt to open a member's document, **then** access is denied and audited.

### US-045 — Help a parent set an emergency policy (S)
As a `FAMILY_ADMIN`, I want to send my parents a guided setup link for their emergency access policy so that the least technical family members are protected too.
- **Given** the guided link, **when** my father completes it, **then** the policy is created on *his* vault under *his* authority, and I receive only a "completed" notification.

### US-046 — Remove a family member (M)
As a `FAMILY_ADMIN`, I want to remove a member from the plan so that plan seats reflect reality.
- **Given** removal, **when** confirmed, **then** the member's account reverts to Free (data intact, read-only above quota) and pooled storage recalculates.

---

## 5. EXECUTOR

### US-047 — Accept an executor nomination (M) *(FR-EST-002)*
As an `EXECUTOR`, I want to formally accept or decline a nomination so that my responsibility is explicit.
- **Given** a nomination email, **when** I accept (creating or linking my `User`), **then** my `Executor` record is active on that vault only, and I can see what scope I would receive — but no documents yet.

### US-048 — Request emergency access on death (M) *(FR-EST-004)*
As an `EXECUTOR`, I want to open an `EmergencyAccessRequest` with a death certificate attached so that the unlock process starts lawfully.
- **Given** I submit the request with evidence, **when** it is created, **then** approvers are notified, the owner is notified on all channels, the delay clock is visible to me, and I can access nothing yet.

### US-049 — Track my request's progress (M)
As an `EXECUTOR`, I want to see approval status, verification status, and time remaining so that I can plan the estate work.
- **Given** 1 of 2 approvals received, **when** I view the request, **then** I see the pending approver (name only), verification stage, and the delay countdown.

### US-050 — Unlock the executor scope (M) *(FR-EST-007/008)*
As an `EXECUTOR`, I want, after verified death and completed workflow, to access exactly the owner-configured executor scope so that I can administer the estate.
- **Given** professional attestation + platform review complete, threshold met, and delay elapsed, **when** the `EmergencyAccessGrant` activates, **then** I can open documents in the granted scope (default `LAST_WILL`, `FUNERAL_INSTRUCTIONS`, `EMERGENCY_CONTACTS`, `INSURANCE`) and nothing else; every open is audited.

### US-051 — Recover client-encrypted items via trustees (M) *(FR-EST-008, FR-VLT-009)*
As an `EXECUTOR`, I want a guided Shamir recovery ceremony with the trustees so that client-encrypted documents in my grant scope become readable.
- **Given** a 2-of-3 policy, **when** two trustees submit shares, **then** decryption succeeds client-side; the ceremony and participants are audited (metadata only).

### US-052 — Export an estate evidence bundle (S) *(FR-AUD-008)*
As an `EXECUTOR`, I want a sealed PDF report of the entire access history and document inventory so that I can present it to the Master of the High Court.
- **Given** an active grant, **when** I request the bundle, **then** I receive a hash-stamped report listing documents (metadata), the full workflow audit narrative, and verification instructions.

---

## 6. BENEFICIARY

### US-053 — See only what was designated for me (M) *(FR-EST-012)*
As a `BENEFICIARY`, I want access strictly limited to the documents the owner designated for me so that privacy and intent are respected.
- **Given** an active grant designating 2 documents to me, **when** I log in, **then** I see exactly those 2; **when** I probe other URLs/IDs, **then** access is denied and audited.

### US-054 — Be notified with care (S)
As a `BENEFICIARY`, I want notification about my access to be clear and compassionate so that a hard moment isn't made harder.
- **Given** a grant activates, **when** I am notified, **then** the message explains what I can access, how, and who to contact — with no technical jargon in the critical path.

---

## 7. LAWYER

### US-055 — Run a professional client dashboard (M) *(FR-SHR-006/010)*
As a `LAWYER`, I want a dashboard of all client vaults I've been granted access to so that client work is organised in one place.
- **Given** 12 clients with active shares to me, **when** I open the dashboard, **then** I see each client, granted scopes, and expiry dates, with per-access audit on my activity.

### US-056 — Request access to a client's documents (M) *(FR-SHR-006)*
As a `LAWYER`, I want to request access to a client's `TRUST` and `PROPERTY` documents so that consent stays with the client.
- **Given** my request, **when** the client approves, **then** a `DocumentShare` is created scoped to those categories; **when** they deny, **then** I am told without revealing what exists.

### US-057 — Run a witnessed signature ceremony for a mandate (M) *(FR-SIG-001/002)*
As a `LAWYER`, I want to initiate a `SignatureRequest` on a client's `POWER_OF_ATTORNEY` with the client and witnesses as sequential signers so that execution evidence is airtight.
- **Given** sequential signing, **when** signer 1 completes, **then** signer 2 is invited automatically; **when** all complete, **then** the sealed artefact with all evidence bundles is stored under Object Lock.

### US-058 — Attest to a death as a verifying professional (M) *(FR-EST-007)*
As a `LAWYER`, I want to review death evidence and record a professional attestation so that executor unlocks are properly verified.
- **Given** a request awaiting professional verification, **when** I attest with my credentials and notes, **then** the attestation is recorded as an `AuditEvent` and the platform review step is triggered.

### US-059 — Verify a signature seal from outside (S) *(FR-SIG-006)*
As a `LAWYER`, I want to verify a document's signature seal via a public verification code so that opposing parties can independently confirm integrity.
- **Given** a verification code, **when** checked, **then** hash match, RFC 3161 timestamp, and signer assertions are confirmed without exposing content.

### US-060 — Onboard my practice on the Professional tier (M) *(FR-BIL-007)*
As a `LAWYER`, I want per-seat Professional billing for my firm so that partners and paralegals each get compliant access.
- **Given** 4 seats purchased, **when** a 5th member is invited, **then** the system prompts for an additional seat before activation.

---

## 8. DOCTOR

### US-061 — Retrieve a living will in an emergency (M) *(FR-EST-009)*
As a `DOCTOR`, I want an expedited, audited path to a patient's `LIVING_WILL` and `MEDICAL_DIRECTIVE` so that treatment follows the patient's documented wishes.
- **Given** an approved medical emergency grant, **when** I open the living will, **then** only `LIVING_WILL`/`MEDICAL_DIRECTIVE` categories are accessible, the access is fully audited, and the owner/family contacts were notified immediately.
- **Given** the same grant, **when** I attempt any other category, **then** access is denied and an `AUTHZ_DENIED` event fires.

### US-062 — Attest to death or incapacity (M) *(FR-EST-007)*
As a `DOCTOR`, I want to record a medical attestation in an emergency access workflow so that verification rests on professional evidence.
- **Given** a pending request, **when** I submit my attestation with registration number and notes, **then** it is immutably recorded and the workflow advances.

---

## 9. HOSPITAL_ADMIN

### US-063 — Initiate an emergency retrieval for an admitted patient (M) *(FR-EST-004/009)*
As a `HOSPITAL_ADMIN`, I want to open an `EmergencyAccessRequest` scoped to living-will categories for an admitted patient so that clinicians get lawful access fast.
- **Given** patient identifiers matching a DLV user with an emergency policy, **when** I submit the request with admission evidence, **then** the expedited scope applies (owner-configurable minimum delay down to 1 h), approvers and the owner are notified instantly.

### US-064 — Manage hospital staff access (M) *(FR-IDN-010)*
As a `HOSPITAL_ADMIN`, I want to manage `OrganisationMember`s and their roles so that only authorised clinicians act under our organisation.
- **Given** a departing doctor, **when** I deactivate their membership, **then** their organisation-scoped access ends immediately and is audited.

### US-065 — Integrate via API and webhooks (S) *(FR-INT-001/002/003)*
As a `HOSPITAL_ADMIN` (with our `COMPANY_ADMIN`), I want API keys and webhooks so that our EHR is notified when an emergency grant activates.
- **Given** a webhook subscription to `emergencyaccess.granted`, **when** a grant activates for our request, **then** our endpoint receives an HMAC-SHA256-signed payload with retry on failure.

---

## 10. FINANCIAL_ADVISER

### US-066 — Request scoped access to client policies (M) *(FR-SHR-006)*
As a `FINANCIAL_ADVISER`, I want to request access to a client's `INSURANCE` and `TAX` documents so that reviews don't happen over email attachments.
- **Given** client approval, **when** I open the share, **then** I see only those categories, watermarked when view-only, with my access audited for both of us.

### US-067 — Get renewal reminders for clients' policies (S) *(FR-NTF-003/004)*
As a `FINANCIAL_ADVISER`, I want reminders when shared client policies approach expiry so that I can proactively advise.
- **Given** a shared policy expiring in 30 days, **when** the reminder job runs, **then** both client and I (per client's sharing settings) are notified.

### US-068 — Keep client access time-boxed (M) *(FR-SHR-001/004)*
As a `FINANCIAL_ADVISER`, I want my client shares to expire automatically so that dormant access doesn't accumulate.
- **Given** a share with 12-month expiry, **when** it lapses, **then** my access ends, both parties are notified, and renewal requires fresh client approval.

---

## 11. COMPANY_ADMIN

### US-069 — Administer the organisation (M) *(FR-IDN-010)*
As a `COMPANY_ADMIN`, I want to manage members, roles, and our organisation profile so that access mirrors our org chart.
- **Given** I assign a member the `FINANCIAL_ADVISER` role, **when** they next authenticate, **then** their permissions reflect the role within our `Organisation` scope only.

### US-070 — Manage API keys safely (M) *(FR-INT-001)*
As a `COMPANY_ADMIN`, I want to create, scope, rotate, and revoke `ApiKey`s so that integrations follow least privilege.
- **Given** key creation with read-documents scope, **when** the key is displayed, **then** it is shown exactly once and stored hashed; **when** it calls a write endpoint, **then** it receives 403.

### US-071 — Subscribe to webhooks (M) *(FR-INT-003)*
As a `COMPANY_ADMIN`, I want webhook subscriptions with signing secrets so that our systems react to DLV events securely.
- **Given** sustained delivery failures, **when** the automatic-disable threshold is hit, **then** the webhook is disabled and I am notified with the failure log.

### US-072 — Consolidated enterprise billing (S) *(FR-BIL-007)*
As a `COMPANY_ADMIN`, I want one seat-based, VAT-compliant invoice per period so that procurement is painless.
- **Given** 60 seats in July, **when** the invoice issues, **then** it shows seat count, ZAR amounts in minor-unit accuracy, and our VAT number.

### US-073 — Read our audit trail via API (S) *(FR-INT-002, FR-AUD-005)*
As a `COMPANY_ADMIN`, I want API access to our organisation's audit events so that we can ingest them into our SIEM.
- **Given** a read-audit-scoped key, **when** we page through `/api/v1` audit endpoints with cursor pagination, **then** we receive only events for our organisation.

---

## 12. SYSTEM_ADMIN

### US-074 — Suspend an abusive account (M) *(FR-ADM-001/002)*
As a `SYSTEM_ADMIN`, I want to suspend an account with a reason code so that abuse stops immediately without destroying data.
- **Given** suspension, **when** applied, **then** all sessions are revoked, API keys disabled, logins and secure links blocked within 60 seconds, the owner is notified, and documents are preserved.

### US-075 — Work the death-verification queue (M) *(FR-ADM-006, FR-EST-007)*
As a `SYSTEM_ADMIN`, I want a review queue for death-verification evidence so that executor unlocks receive human platform review.
- **Given** a pending item with a death certificate and professional attestation, **when** I approve with mandatory notes, **then** the workflow advances and my review is an immutable `AuditEvent`; **when** I reject, **then** the requester is informed with the reason category.

### US-076 — Never see document content (M) *(FR-ADM-001)*
As a `SYSTEM_ADMIN`, I want the back-office to be technically incapable of showing me document plaintext so that operator access can never become a breach vector.
- **Given** any back-office view of a user, **when** rendered, **then** only metadata appears; direct object access attempts are denied and audited.

### US-077 — Adjust quotas and feature flags (S) *(FR-ADM-001/007)*
As a `SYSTEM_ADMIN`, I want to adjust a user's quota or flags with an audited reason so that support cases resolve cleanly.

### US-078 — Watch operational health (S) *(FR-ADM-008)*
As a `SYSTEM_ADMIN`, I want dashboards for quarantine failures, webhook failures, dunning, and in-flight emergency requests so that I catch problems before users do.

---

## 13. SUPER_ADMIN

### US-079 — Dual-control sensitive actions (M) *(FR-ADM-003)*
As a `SUPER_ADMIN`, I want platform-role grants, legal holds, and break-glass access to require a second `SUPER_ADMIN` approval so that no single person holds unilateral power.
- **Given** I initiate a `LegalHold`, **when** no second approval exists, **then** nothing takes effect; **when** a second `SUPER_ADMIN` approves, **then** the hold applies and both identities are audited.

### US-080 — Place and release legal holds (M) *(FR-ADM-004)*
As a `SUPER_ADMIN`, I want to place a `LegalHold` on a vault under litigation so that nothing can be purged until release.
- **Given** an active hold, **when** any purge (trash, account deletion, retention) targets held objects, **then** the purge skips them and records why.

---

## 14. AUDITOR

### US-081 — Query the platform audit trail (M) *(FR-AUD-005)*
As an `AUDITOR`, I want read-only, filterable access to all audit events so that I can run compliance reviews.
- **Given** a filter (actor, resource, event type, time range), **when** I export to CSV/JSON, **then** the export matches the filter exactly and contains no document plaintext or decrypted PII.

### US-082 — Verify the hash chain (M) *(FR-AUD-002)*
As an `AUDITOR`, I want on-demand verification of the audit hash chain so that I can prove the trail is untampered.
- **Given** a verification run over a date range, **when** it completes, **then** I get a signed pass result — or the exact first broken link if tampering occurred.

### US-083 — Review an emergency access narrative (S) *(FR-AUD-008)*
As an `AUDITOR`, I want the complete human-readable narrative of any emergency access case so that I can certify the workflow was followed.

---

## 15. SUPPORT_AGENT

### US-084 — Access an account only with consent (M) *(FR-ADM-005)*
As a `SUPPORT_AGENT`, I want account access gated on explicit, time-boxed user consent so that support never becomes surveillance.
- **Given** a support ticket, **when** the user grants 24 h consent, **then** I can view account metadata (never document content or decrypted PII) until expiry; **when** consent lapses or is revoked, **then** my access ends immediately.

### US-085 — Help a locked-out user safely (M)
As a `SUPPORT_AGENT`, I want scripted, audited recovery flows (resend verification, guide TOTP recovery-code use, escalate identity re-verification) so that I can help without ever bypassing security controls.
- **Given** a user who lost both password and TOTP device, **when** I assist, **then** recovery requires their recovery codes or a formal identity re-verification process — I have no override capability.

---

*85 stories. End of User Stories v1.0.0 — conforms to PROJECT_MEMORY.md (2026-07-05).*
