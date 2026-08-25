# Use Cases

## Digital Legacy Vault (DLV)

| Field | Value |
|---|---|
| Document | Formal Use Cases |
| Product | Digital Legacy Vault (DLV) |
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Architecture Team |
| Canonical source | `PROJECT_MEMORY.md` |

Conventions: actors use canonical role names; entities use canonical entity names. Every flow step that is security-relevant emits an `AuditEvent` (append-only, hash-chained) — this is stated once here and not repeated per step. Traceability to SRS requirements is noted per use case.

### Index

| ID | Name | Primary actor |
|---|---|---|
| UC-001 | Register with a passkey | `GUEST` |
| UC-002 | Upload a document through the quarantine pipeline | `REGISTERED_USER` |
| UC-003 | Opt a document into the Client-Encrypted Vault | `PREMIUM_USER` |
| UC-004 | Sign a document (signature ceremony) | Signer (`PREMIUM_USER` / external signer) |
| UC-005 | Share a document via secure link with QR | `REGISTERED_USER` |
| UC-006 | Revoke a share / secure link | `REGISTERED_USER` |
| UC-007 | Professional requests access; owner approves | `LAWYER` / `FINANCIAL_ADVISER` |
| UC-008 | Nominate and accept an executor | `PREMIUM_USER`, nominee |
| UC-009 | Grant emergency access after death verification | `EXECUTOR` |
| UC-010 | Executor unlocks the vault (incl. Shamir recovery) | `EXECUTOR` |
| UC-011 | Hospital retrieves a living will via emergency access | `HOSPITAL_ADMIN`, `DOCTOR` |
| UC-012 | Upgrade a subscription | `REGISTERED_USER`/`PREMIUM_USER` |
| UC-013 | Admin suspends an account | `SYSTEM_ADMIN` |
| UC-014 | Auditor reviews the audit trail and verifies the chain | `AUDITOR` |
| UC-015 | User deletes their account (POPIA/GDPR erasure) | `REGISTERED_USER`/`PREMIUM_USER` |

---

## UC-001 — Register with a passkey

| Field | Detail |
|---|---|
| Primary actor | `GUEST` |
| Supporting actors | WebAuthn platform authenticator; `notification` context (SES) |
| Traceability | FR-IDN-001/002/003/013; US-001, US-002 |
| Preconditions | Actor is unauthenticated; browser supports WebAuthn; email not already registered |
| Trigger | Actor selects "Create account" and chooses "Continue with passkey" |

**Main flow**
1. `GUEST` enters email address and accepts terms/privacy policy (versions captured as `Consent`).
2. System validates email format and uniqueness.
3. System initiates WebAuthn registration (challenge, relying-party ID) with user-verification required.
4. Actor completes the platform authenticator gesture (biometric/PIN).
5. System verifies the attestation response, creates the `User` (status pending-verification), a `Device` record (credential ID, authenticator metadata), a default `Vault`, and `Consent` records.
6. System sends a verification email (single-use link, 24 h validity).
7. Actor clicks the link; system activates the account and establishes a session (15-min JWT access + rotating httpOnly refresh token).
8. System shows onboarding (upload first document, nominate executor, add 2FA backup).

**Alternative flows**
- A1 (step 3): Browser lacks WebAuthn → system offers password + TOTP registration path; flow continues per FR-IDN-001/004.
- A2 (step 4): Actor cancels the authenticator prompt → system re-offers passkey or falls back to A1.
- A3 (step 7): Verification link expired → system offers resend; new single-use link issued, old invalidated.

**Exception flows**
- E1 (step 2): Email already registered → generic "check your inbox" response (no account enumeration); existing owner is emailed a sign-in reminder.
- E2 (step 5): Attestation verification fails → registration aborted; no partial `User` persisted; actor may retry.
- E3 (step 6): SES delivery failure → delivery retried via BullMQ with backoff; actor can request resend.

**Postconditions:** active `User` with passkey `Device`, default `Vault`, `Consent` records, verified email; audit chain contains registration events.

---

## UC-002 — Upload a document through the quarantine pipeline

| Field | Detail |
|---|---|
| Primary actor | `REGISTERED_USER` (any vault owner role) |
| Supporting actors | S3 (quarantine + vault buckets), ClamAV scanner, Textract/Tesseract (OCR), `AiGateway` |
| Traceability | FR-VLT-001…008, FR-VLT-012, FR-AI-001; NFR-SEC-005; US-010/011/012 |
| Preconditions | Authenticated session; vault within plan quota; file ≤ 500 MB |
| Trigger | Actor drags a file into the vault or calls `POST /api/v1/documents` |

**Main flow**
1. Actor initiates upload with filename, size, and optional target `Document` (new version) or new document.
2. System checks quota (FR-VLT-012) and issues pre-signed multipart upload URLs to the S3 quarantine bucket.
3. Client uploads parts (resumable); system records completion.
4. Quarantine pipeline runs: ClamAV scan → magic-byte file-type validation → SHA-256 hash computed and recorded.
5. On pass, system promotes the object to the vault bucket (SSE-KMS; per-document DEK wrapped by the tenant CMK) and creates the `Document` + `DocumentVersion` (v1) with hash, size, uploader, timestamp.
6. System queues OCR (Standard tier only); extracted text is indexed for search.
7. System queues AI classification via `AiGateway`; a `DocumentCategory` from the canonical enum and suggested `Tag`s are proposed with confidence.
8. Actor confirms or overrides category and tags; metadata (title, expiry date, issuer) may be added — expiry feeds the `Reminder` engine.
9. System notifies the actor of successful filing; document appears in dashboard and timeline.

**Alternative flows**
- A1 (step 1): Upload targets an existing `Document` → step 5 creates the next `DocumentVersion`; prior versions remain immutable and downloadable.
- A2 (step 3): Connection drops → multipart upload resumes from last completed part.
- A3 (step 7): Vault has AI disabled (FR-AI-007) or document is Client-Encrypted → classification skipped; actor selects category manually.
- A4 (step 4): Duplicate SHA-256 detected in the vault → actor warned; may proceed or cancel (FR-VLT-017).

**Exception flows**
- E1 (step 2): Quota exceeded → 4xx problem+json with quota detail; UI shows upgrade path; nothing stored.
- E2 (step 4): Malware detected → object never promoted; quarantined copy destroyed after evidence hash retained; actor notified with reason; repeated infected uploads flag the account for `SYSTEM_ADMIN` review.
- E3 (step 4): Magic-byte mismatch with declared type → reject with reason; actor may re-upload correct file.
- E4 (step 6): OCR job fails after retries → document remains fully usable; search covers metadata only; failure visible on ops dashboard (FR-ADM-008).

**Postconditions:** promoted, encrypted `Document`/`DocumentVersion` with recorded hash; OCR text indexed (Standard tier); category confirmed; quarantine evidence and all steps in the audit chain. On rejection: no retrievable object exists.

---

## UC-003 — Opt a document into the Client-Encrypted Vault

| Field | Detail |
|---|---|
| Primary actor | `PREMIUM_USER` |
| Supporting actors | Nominated trustees (any registered users); browser crypto (client-side AES-256-GCM) |
| Traceability | FR-VLT-009, FR-AI-005, NFR-SEC-012; US-033/034 |
| Preconditions | Paid plan with Client-Encrypted Vault; 2FA enabled (FR-IDN-005); document selected or being uploaded |
| Trigger | Actor toggles "Client-Encrypted Vault" on a document (e.g., `CRYPTO_RECOVERY`) |

**Main flow**
1. System explains consequences: OCR/AI/preview disabled; server can never decrypt; key loss without trustee quorum = permanent loss. Actor must type an acknowledgement phrase.
2. Actor nominates trustees and threshold (default 2-of-3).
3. Browser generates the document key, encrypts the file with AES-256-GCM client-side, and splits the key via Shamir secret-sharing to the trustee set.
4. Encrypted shares are delivered to trustees (each protected to the trustee's account; trustees accept custodianship explicitly).
5. Ciphertext is uploaded through the standard quarantine pipeline (scan operates on the encrypted blob for policy compliance; magic-byte check expects the DLV envelope format) and stored; server records only ciphertext + envelope metadata.
6. System marks the `Document` as client-encrypted: AI/OCR/preview pipelines are hard-excluded at the `AiGateway`/worker boundary.

**Alternative flows**
- A1 (step 2): A nominated trustee has no DLV account → invitation issued; opt-in completes only when the threshold count of trustees have accepted.
- A2: Actor later rotates trustees → new shares generated client-side after actor decrypts locally; old shares revoked.

**Exception flows**
- E1 (step 3): Browser crypto unavailable → operation blocked with guidance; no partial state.
- E2 (step 4): Trustees below threshold decline → actor warned the recovery guarantee is not met; opt-in held pending or actor reduces threshold consciously (re-acknowledgement required).

**Postconditions:** document stored as ciphertext only; trustee shares distributed; AI/OCR/preview disabled; acknowledgements and trustee acceptances audited.

---

## UC-004 — Sign a document (signature ceremony)

| Field | Detail |
|---|---|
| Primary actor | Signer (`PREMIUM_USER`, or external signer via email) |
| Supporting actors | Requester; RFC 3161 TSA; S3 Object Lock |
| Traceability | FR-SIG-001…009; NFR-CMP-006/007; US-035/036/057 |
| Preconditions | A `SignatureRequest` exists on a specific `DocumentVersion`; signer invited; request unexpired |
| Trigger | Signer opens the signing invitation |

**Main flow**
1. System verifies signer identity: authenticated session, or for external signers email OTP (plus optional SMS OTP per request settings); identity evidence captured.
2. System displays the exact `DocumentVersion` with its SHA-256 hash visible and requires scroll-through/acknowledgement.
3. If the document is categorised `LAST_WILL`, the Wills Act 7 of 1953 notice is displayed and explicit acknowledgement is required and recorded (electronic signature does not execute a will; wet-ink + witnesses required; DLV preserves evidence only).
4. Signer applies a mark: draw, type, or upload.
5. Signer confirms intent ("I agree to sign this document electronically") — consent text version recorded.
6. System creates the `Signature`: SHA-256 digest of the signed version, RFC 3161 trusted timestamp token, signer identity assertion, device/IP/user-agent evidence bundle.
7. System renders the sealed artefact (signed rendition + evidence certificate) and stores it under S3 Object Lock (compliance mode).
8. Sequential requests: next signer is invited; parallel: remaining signers proceed independently. When all complete, requester and signers receive the sealed artefact notification and a verification code.

**Alternative flows**
- A1 (step 4): Accessibility path — type-to-sign is always available as the keyboard-operable alternative to the draw pad (NFR-ACC-002).
- A2 (step 8): Signer declines with a reason → sequential downstream steps cancel; requester notified (FR-SIG-008).
- A3: Request nears expiry → reminders at 50% and 90% of the window (FR-SIG-009).

**Exception flows**
- E1 (step 1): OTP verification fails repeatedly → signing link locked; requester notified.
- E2 (step 6): TSA unreachable → seal step retries with backoff; signature not finalised until a valid timestamp token is obtained (no unsealed completions).
- E3 (step 2): Document version changed since request creation → ceremony blocked; requester must re-issue against the new version.

**Postconditions:** `Signature` records with full evidence exist; sealed artefact immutable under Object Lock; verification code usable via the public verification endpoint (FR-SIG-006); Wills Act acknowledgement (if applicable) in the evidence bundle.

---

## UC-005 — Share a document via secure link with QR

| Field | Detail |
|---|---|
| Primary actor | `REGISTERED_USER` (vault owner) |
| Supporting actors | Recipient (`GUEST` or registered); `notification` context |
| Traceability | FR-SHR-002/003/005/008/011; US-019, US-003 |
| Preconditions | Document promoted and Standard-tier (Client-Encrypted documents are excluded from server-rendered sharing, FR-SHR-009) |
| Trigger | Actor selects "Share → Secure link" |

**Main flow**
1. Actor selects document(s) and configures: expiry (default 7 days, max 90), optional password, optional download limit, optional recipient email-OTP, view-only vs download.
2. System creates the `SecureLink` with an unguessable token (≥ 128 bits entropy) and generates the QR code.
3. Actor copies the link/QR or has the system send it to a recipient address.
4. Recipient opens the link; system enforces password/OTP if configured.
5. System serves a view-only watermarked preview (recipient identity/timestamp) or permits download if enabled, decrementing any download limit.
6. Owner is notified on first access; every access is recorded and visible in the owner's timeline.

**Alternative flows**
- A1 (step 4): Recipient email-OTP configured → OTP sent and validated before content renders.
- A2 (step 5): Download limit reached → further downloads refused; viewing may continue until expiry.
- A3: Link expires → link returns 410 Gone; owner notified of expiry (FR-SHR-008).

**Exception flows**
- E1 (step 4): Wrong password 5 times → link temporarily locked (429), owner notified of repeated failures.
- E2 (step 4): Link token invalid/revoked → 410 Gone with zero metadata disclosure.

**Postconditions:** active (or consumed/expired) `SecureLink` with complete access audit; owner has full visibility of who accessed what and when.

---

## UC-006 — Revoke a share / secure link

| Field | Detail |
|---|---|
| Primary actor | `REGISTERED_USER` (vault owner) |
| Traceability | FR-SHR-004; US-020, US-068 |
| Preconditions | An active `DocumentShare` or `SecureLink` exists |
| Trigger | Actor clicks "Revoke" on a share, or account security event triggers bulk revocation |

**Main flow**
1. Actor opens the sharing panel listing all active `DocumentShare`s and `SecureLink`s with recipients, scopes, and expiries.
2. Actor selects the share/link and confirms revocation.
3. System marks it revoked; caches/CDN entries are invalidated.
4. Any new request against it fails within 60 seconds (410 Gone), including range/continuation requests on in-flight downloads.
5. Recipient (if a registered user) and owner receive confirmation notifications.

**Alternative flows**
- A1: Bulk revoke — actor revokes all shares on a document or all shares in the vault in one action (e.g., after a security scare).
- A2: Revocation of an organisation-scoped share ends access for all `OrganisationMember`s simultaneously.

**Exception flows**
- E1 (step 3): Cache invalidation lag detected beyond 60 s → alert raised on the ops dashboard; access attempts during lag are still policy-checked server-side and denied.

**Postconditions:** share/link permanently unusable; revocation and any post-revocation attempts audited.

---

## UC-007 — Professional requests access; owner approves

| Field | Detail |
|---|---|
| Primary actor | `LAWYER` or `FINANCIAL_ADVISER` |
| Supporting actors | Vault owner |
| Traceability | FR-SHR-006/001/005; US-056, US-066 |
| Preconditions | Professional has a verified professional account; knows the client's registered email or connection code |
| Trigger | Professional submits an access request for named document categories |

**Main flow**
1. Professional creates an access request: target user, requested categories (e.g., `INSURANCE`, `TAX`), purpose statement, requested duration.
2. System notifies the owner with the professional's verified identity and the exact scope requested.
3. Owner reviews and approves, optionally narrowing scope/duration.
4. System creates the `DocumentShare` scoped to the approved categories and duration.
5. Professional is notified and sees the client in their professional dashboard; all subsequent accesses are audited and visible to the owner.

**Alternative flows**
- A1 (step 3): Owner denies → professional notified; no information about the vault's contents (or the existence of documents in those categories) is disclosed.
- A2 (step 3): Owner ignores → request expires after 14 days; requester may re-send once per 30 days (anti-nagging control).

**Exception flows**
- E1 (step 1): Target email not registered → owner-to-be receives an invitation explaining the request; no vault exists until they register.

**Postconditions:** consent-based, time-boxed, category-scoped share exists (or a clean denial); mutual audit trail.

---

## UC-008 — Nominate and accept an executor

| Field | Detail |
|---|---|
| Primary actor | `PREMIUM_USER` (vault owner); nominee (becomes `EXECUTOR`) |
| Traceability | FR-EST-002/003; US-021, US-047 |
| Preconditions | Owner authenticated; nominee contactable by email |
| Trigger | Owner adds an executor in the estate centre |

**Main flow**
1. Owner enters nominee details and selects the executor scope (default: `LAST_WILL`, `FUNERAL_INSTRUCTIONS`, `EMERGENCY_CONTACTS`, `INSURANCE`; owner may add categories).
2. System sends the nomination invitation explaining rights, duties, and that no access exists until a verified emergency grant.
3. Nominee accepts, creating or linking their `User` account (2FA enrolment required).
4. System activates the `Executor` record scoped to that `Vault` only; ABAC policies attach.
5. Both parties receive confirmation; owner's estate readiness score updates.
6. Owner configures/updates the emergency access policy (approvers, threshold ≥ 2 parties, delay 24 h–30 days default 72 h, released scope) — FR-EST-003.

**Alternative flows**
- A1 (step 3): Nominee declines → owner notified and prompted to nominate another.
- A2: Owner replaces an executor → old `Executor` record deactivated with notification; history preserved.

**Exception flows**
- E1 (step 3): Invitation expires (30 days) unaccepted → owner notified; may re-send.

**Postconditions:** accepted `Executor` bound to the vault; emergency access policy in place; zero document access granted yet.

---

## UC-009 — Grant emergency access after death verification

| Field | Detail |
|---|---|
| Primary actor | `EXECUTOR` (requester) |
| Supporting actors | Approvers (owner-designated), verifying professional (`DOCTOR` or `LAWYER`), `SYSTEM_ADMIN` (platform review), vault owner (veto right), `notification` context |
| Traceability | FR-EST-004…008; security invariant 6; US-048/049/058/075 |
| Preconditions | Accepted `Executor`; owner's emergency access policy configured; owner presumed deceased |
| Trigger | Executor opens an `EmergencyAccessRequest` (reason: death) with a death certificate attached |

**Main flow**
1. Executor submits the `EmergencyAccessRequest` with reason, evidence (death certificate), and declaration of truthfulness.
2. System immediately notifies the vault owner on **all** verified channels (email, SMS/WhatsApp, push) and notifies all policy approvers.
3. Approvers review the request and evidence; each records approve/deny. The policy threshold (≥ 2 parties) must be met.
4. In parallel, death verification runs: (a) a verifying professional (`DOCTOR` or `LAWYER`) records an attestation; (b) a `SYSTEM_ADMIN` reviews evidence in the back-office queue and approves with notes.
5. When threshold approvals + both verifications are complete, the mandatory time delay starts (per policy, default 72 h). The owner retains veto throughout.
6. Delay elapses with no veto → system creates the `EmergencyAccessGrant` releasing only the policy-configured scope, time-boxed (default 30 days).
7. All parties (executor, approvers, beneficiaries designated in scope) are notified; the complete workflow narrative is available for export (FR-AUD-008).

**Alternative flows**
- A1 (step 3): An approver denies → request halts; executor may address concerns and re-submit; all recorded.
- A2 (step 5): Owner responds (is alive) and vetoes → request cancelled instantly; all parties notified; repeated false claims flag the requester for review.
- A3 (step 6): Grant expiry approaches with estate work incomplete → executor requests extension; re-approval by threshold required.

**Exception flows**
- E1 (step 4): Platform review rejects the evidence (illegible/suspect certificate) → request rejected with reason category; executor may re-submit with corrected evidence; suspected fraud escalates to `SUPER_ADMIN` and may trigger account protection measures.
- E2 (step 2): A notification channel fails → remaining channels proceed; failures logged and retried; the workflow never silently skips owner notification.

**Postconditions:** `EmergencyAccessGrant` active, scope- and time-boxed; every step (request, notifications, approvals, attestations, review, delay, activation) in the hash-chained audit trail; owner-veto path proven exercised or expired.

---

## UC-010 — Executor unlocks the vault

| Field | Detail |
|---|---|
| Primary actor | `EXECUTOR` |
| Supporting actors | Shamir trustees (for Client-Encrypted documents); `BENEFICIARY` recipients |
| Traceability | FR-EST-008/012; FR-VLT-009; US-050/051/052/053 |
| Preconditions | Active `EmergencyAccessGrant` from UC-009 with executor scope |
| Trigger | Executor opens the unlocked vault view |

**Main flow**
1. Executor sees exactly the granted scope (default `LAST_WILL`, `FUNERAL_INSTRUCTIONS`, `EMERGENCY_CONTACTS`, `INSURANCE`, plus owner-added categories) — nothing else is listed or reachable.
2. Executor views/downloads documents in scope; each access is audited individually.
3. For Client-Encrypted documents within scope, executor initiates the Shamir recovery ceremony; trustees are notified.
4. Threshold trustees (default 2-of-3) submit their shares; the key reconstructs client-side; the executor decrypts locally.
5. Documents designated to `Beneficiary` records become visible to those beneficiaries per the owner's designations (FR-EST-012) — never the whole vault.
6. Executor exports the estate evidence bundle (document inventory metadata + sealed audit narrative PDF) for the Master of the High Court.

**Alternative flows**
- A1 (step 4): Trustee unreachable → executor proceeds with any threshold subset; if below threshold, the document remains encrypted (by design) and the bundle notes it.
- A2 (step 6): Grant expires mid-administration → extension via re-approval (UC-009 A3).

**Exception flows**
- E1 (step 1): Executor attempts out-of-scope resource IDs → 403, `AUTHZ_DENIED` audit event; repeated probing alerts `SYSTEM_ADMIN`.
- E2 (step 4): Share submission fails integrity check → ceremony aborts for that attempt; trustees re-submit; all attempts audited.

**Postconditions:** estate documents in scope retrieved with per-access audit; beneficiaries served their designated documents only; evidence bundle exported; client-encrypted material decrypted only where trustee quorum was met.

---

## UC-011 — Hospital retrieves a living will via emergency access

| Field | Detail |
|---|---|
| Primary actor | `HOSPITAL_ADMIN` (initiates), `DOCTOR` (retrieves and attests) |
| Supporting actors | Policy approvers; vault owner (notified/veto); `notification` context |
| Traceability | FR-EST-009/005; NFR-AVL-004; US-061/062/063 |
| Preconditions | Patient is a DLV user with an emergency access policy; hospital is an `Organisation` with verified members; patient admitted and unable to consent |
| Trigger | `HOSPITAL_ADMIN` opens an `EmergencyAccessRequest`, reason: medical emergency, scope strictly `LIVING_WILL` + `MEDICAL_DIRECTIVE` |

**Main flow**
1. `HOSPITAL_ADMIN` submits the request with patient identifiers and admission evidence; a `DOCTOR` records the medical attestation.
2. System matches the patient to a `User`/`Vault`, notifies the owner instantly on all channels, and notifies the policy approvers.
3. Approvers respond per the owner's policy threshold; the expedited minimum delay for this scope applies (owner-configurable down to 1 h).
4. Delay elapses without owner veto → `EmergencyAccessGrant` activates, scoped strictly to `LIVING_WILL` and `MEDICAL_DIRECTIVE`, short time-box (default 7 days for medical scope).
5. `DOCTOR` retrieves the living will; the access is audited (who, when, from where) and the owner's emergency contacts are notified that retrieval occurred.
6. Clinical team acts on the directive; hospital's `Webhook` (if configured) receives `emergencyaccess.granted`.

**Alternative flows**
- A1 (step 2): No matching DLV user found → requester informed "no match" only; no probing of the user base is possible (rate-limited, audited lookups).
- A2 (step 3): Owner responds (conscious) → owner can veto or simply grant the hospital a direct time-boxed share themselves, superseding the emergency flow.
- A3: Patient carries a DLV wallet-card QR (`SecureLink` prepared by the owner for exactly this scenario) → clinicians use the owner-preconfigured link path (UC-005) instead; the emergency workflow is not needed.

**Exception flows**
- E1 (step 3): Approvers unreachable within the clinical window → request remains pending; the system escalates reminders; DLV never bypasses the multi-party requirement (invariant 6) — the wallet-card QR (A3) is the designed mitigation for time-critical care, and hospital onboarding materials say so.
- E2 (step 5): Doctor attempts out-of-scope access → denied, audited, hospital `COMPANY_ADMIN` notified on repeat.
- E3: Platform degradation → the emergency read path runs in priority degraded mode (read-only) per NFR-AVL-004.

**Postconditions:** directive retrieved under a lawful, fully audited, scope-limited grant; owner and contacts notified; grant expires on its time-box.

---

## UC-012 — Upgrade a subscription

| Field | Detail |
|---|---|
| Primary actor | `REGISTERED_USER` (to Premium/Family) or `PREMIUM_USER` (to Family/Professional) |
| Supporting actors | Stripe (checkout, webhooks, billing portal) |
| Traceability | FR-BIL-001…006/009; US-027/028/029/043 |
| Preconditions | Authenticated; a valid upgrade path exists between `Plan`s |
| Trigger | Actor selects a higher tier on the plans page or from a quota prompt |

**Main flow**
1. Actor selects the target `Plan` and billing period (monthly/annual, ZAR).
2. System creates a Stripe checkout session (idempotency key attached).
3. Actor completes payment in Stripe checkout.
4. Stripe webhook (signature-verified, idempotent) confirms; system updates the `Subscription` to the new `Plan` with proration applied.
5. New quotas and feature flags take effect immediately; monetary amounts recorded as integer minor units + currency code.
6. Actor receives confirmation and a VAT-compliant invoice via the billing portal.

**Alternative flows**
- A1: Family upgrade → actor becomes `FAMILY_ADMIN` and may invite up to 6 members (US-043).
- A2: Downgrade instead → takes effect at period end; over-quota data becomes read-only, never deleted (FR-BIL-006).
- A3 (step 3): Actor abandons checkout → no change; session expires harmlessly.

**Exception flows**
- E1 (step 4): Webhook delayed/not received → reconciliation job polls Stripe; UI shows "processing" state; support-visible alert if unresolved after 15 minutes.
- E2 (step 3): Payment fails → Stripe surfaces the failure; no plan change; actor may retry with another method.

**Postconditions:** `Subscription` reflects the new `Plan`; entitlements active; billing records consistent with Stripe as source of truth for payment state.

---

## UC-013 — Admin suspends an account

| Field | Detail |
|---|---|
| Primary actor | `SYSTEM_ADMIN` |
| Supporting actors | Affected user; `notification` context |
| Traceability | FR-ADM-001/002; US-074/076 |
| Preconditions | Admin authenticated with 2FA; documented cause (abuse report, malware uploads, fraud signal, legal instruction) |
| Trigger | Admin opens the account in the back-office and selects "Suspend" |

**Main flow**
1. Admin locates the account (metadata only — document content is technically unavailable to admins).
2. Admin selects a reason code and writes a mandatory note.
3. System executes suspension atomically: all `Session`s revoked, `ApiKey`s disabled, logins blocked, all `SecureLink`s and `DocumentShare`s blocked — within 60 seconds.
4. Owner is notified of the suspension with the reason category and the appeal channel.
5. Documents and data are preserved untouched; scheduled purges affecting the account pause pending review.

**Alternative flows**
- A1: Suspension pending investigation → admin applies a time-boxed suspension with auto-review reminder.
- A2: Unsuspension → admin lifts with a note; sessions/keys/shares require re-establishment by the owner (nothing silently reactivates).
- A3: Legal instruction accompanies suspension → `SUPER_ADMIN` dual-control `LegalHold` placed (FR-ADM-003/004) so nothing can be purged.

**Exception flows**
- E1 (step 3): Partial failure in the revocation fan-out → system retries and raises an ops alert; account remains flagged deny-at-gateway so no access is possible during remediation.

**Postconditions:** account fully inert (no login, API, or share access); data preserved; owner informed; complete audit trail of who suspended, why, and what was revoked.

---

## UC-014 — Auditor reviews the audit trail and verifies the chain

| Field | Detail |
|---|---|
| Primary actor | `AUDITOR` |
| Traceability | FR-AUD-002/005/006/008; US-081/082/083 |
| Preconditions | `AUDITOR` platform role with 2FA; read-only console access |
| Trigger | Scheduled compliance review, incident investigation, or external audit support |

**Main flow**
1. Auditor opens the auditor console and defines a query: actor, resource, event type, time range.
2. System returns matching `AuditEvent`s (metadata only — never document plaintext or decrypted PII).
3. Auditor drills into a case (e.g., an emergency access request) and views the human-readable workflow narrative.
4. Auditor runs on-demand hash-chain verification over the selected range: system recomputes each event's expected SHA-256-of-previous linkage, including checkpoints across retention tiers (Postgres hot → S3 Object Lock archive).
5. System returns a signed verification result: pass, or the exact first broken link.
6. Auditor exports findings (CSV/JSON) matching the applied filters; the export action itself is audited.

**Alternative flows**
- A1: External audit (ISO 27001 / SOC 2 evidence) → auditor generates the evidence pack from pre-mapped control queries.
- A2 (step 4): Range spans archived events → verification transparently reads the Object Lock archive.

**Exception flows**
- E1 (step 5): Verification fails → immediate page to security on-call (NFR-OBS-003); incident process starts; the failing segment is preserved for forensics.
- E2 (step 1): Auditor attempts any mutating action → denied by role definition (read-only); denial audited.

**Postconditions:** compliance conclusion documented with chain-integrity proof; zero mutation possible or performed by the auditor; export trail recorded.

---

## UC-015 — User deletes their account (POPIA/GDPR erasure)

| Field | Detail |
|---|---|
| Primary actor | `REGISTERED_USER` / `PREMIUM_USER` |
| Supporting actors | `billing` (Stripe), `admin` (legal-hold check), purge workers |
| Traceability | DRR-005/007; NFR-CMP-001/002; US-024 |
| Preconditions | Authenticated with recent re-authentication (step-up); no active `LegalHold` blocking erasure |
| Trigger | Actor selects "Delete my account" in settings |

**Main flow**
1. System explains consequences and the disclosed retention exceptions (sealed signature artefacts under Object Lock, pseudonymised audit metadata, tax-required billing records — 5 years, SARS).
2. Actor confirms with step-up authentication (passkey or password + 2FA).
3. System starts the 14-day cooling-off: account enters deletion-pending state (login allowed only to cancel; shares and links disabled immediately).
4. System notifies the actor on all channels at start, day 7, and day 13.
5. Cooling-off elapses without cancellation → purge executes: documents and all `DocumentVersion`s (all S3 object versions), PII, OCR text, AI outputs, search indexes, notification bodies; Stripe subscription cancelled; API keys destroyed.
6. Tombstone log records the deletion so backup restores re-apply it (backups age out within 35 days — DRR-007).
7. Final confirmation is sent to the (now-external) email address; remaining records are the disclosed exceptions only, with the audit trail referencing a pseudonymised actor.

**Alternative flows**
- A1 (step 3–4): Actor cancels during cooling-off → account fully restored; shares/links require manual re-enablement (deliberate friction).
- A2: Executors/beneficiaries are configured → step 1 additionally warns that estate protections end with deletion; actor must acknowledge explicitly.

**Exception flows**
- E1: `LegalHold` exists → deletion request is accepted but purge is blocked for held objects until release; actor informed of the legal basis at the level counsel permits.
- E2 (step 5): Partial purge failure → job retries idempotently; account remains inert; ops alerted; completion is verified before the final confirmation email.

**Postconditions:** account and personal data erased except disclosed lawful exceptions; erasure provable via tombstone + audit metadata; backups converge within the 35-day window.

---

*End of Use Cases v1.0.0 — 15 use cases. Conforms to PROJECT_MEMORY.md (2026-07-05).*
