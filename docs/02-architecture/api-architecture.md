# API Architecture — Digital Legacy Vault

| Document Control | |
|---|---|
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Architecture Team |
| Source of truth | `PROJECT_MEMORY.md` |

---

## 1. Principles

- REST under `/api/v1` (OpenAPI 3.1) is the **primary contract** for all writes and integrations. GraphQL (`/graphql`, code-first NestJS/Apollo) serves read-heavy dashboard/timeline queries only. Webhooks carry outbound events.
- Plural resources, kebab-case paths, UUIDv7 identifiers, cursor pagination, RFC 9457 problem+json errors, idempotency keys on POST.
- **Deny-by-default:** every route declares an explicit policy (`@Policy(...)`); a route without one fails closed at boot. Policies combine RBAC roles with ABAC (CASL) conditions — the tables below list the *policy intent*, evaluated against org membership, vault relationships, entitlements, and resource state.
- All requests over TLS 1.3; auth context is JWT (users), session cookie (web), or API key (partners).

## 2. Resource map (representative endpoints per bounded context)

Auth column: `JWT` = user access token, `Cookie` = web session, `Key` = org API key, `Public` = unauthenticated, `Sig` = provider signature verification.

### 2.1 `identity`

| Method | Path | Auth | Policy (roles / ABAC) |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | rate-limited; email verification required |
| POST | `/api/v1/auth/login` | Public | credentials + optional TOTP step-up |
| POST | `/api/v1/auth/token/refresh` | Cookie (refresh) | valid, unrotated refresh token |
| POST | `/api/v1/auth/logout` | JWT | self |
| POST | `/api/v1/auth/webauthn/registration/options` | JWT | self |
| POST | `/api/v1/auth/webauthn/registration/verify` | JWT | self |
| POST | `/api/v1/auth/webauthn/authentication/options` | Public | — |
| POST | `/api/v1/auth/webauthn/authentication/verify` | Public | signed assertion |
| POST | `/api/v1/auth/totp/enrol` | JWT | self; fresh authentication required |
| POST | `/api/v1/auth/totp/verify` | JWT | self |
| GET | `/api/v1/users/me` | JWT | self |
| PATCH | `/api/v1/users/me` | JWT | self |
| GET | `/api/v1/users/me/sessions` | JWT | self (`Session` list) |
| DELETE | `/api/v1/users/me/sessions/{sessionId}` | JWT | self (revoke) |
| GET | `/api/v1/users/me/devices` | JWT | self (`Device` list) |
| POST | `/api/v1/organisations` | JWT | REGISTERED_USER+ (becomes COMPANY_ADMIN) |
| GET | `/api/v1/organisations/{orgId}` | JWT/Key | org member; key scope `org:read` |
| POST | `/api/v1/organisations/{orgId}/members` | JWT | COMPANY_ADMIN / HOSPITAL_ADMIN of org |
| PATCH | `/api/v1/organisations/{orgId}/members/{memberId}` | JWT | COMPANY_ADMIN of org |
| GET | `/api/v1/users/me/consents` | JWT | self (`Consent` records) |
| POST | `/api/v1/users/me/consents` | JWT | self |

### 2.2 `vault`

| Method | Path | Auth | Policy |
|---|---|---|---|
| GET | `/api/v1/vaults` | JWT | vaults where actor is owner or has a vault relationship |
| POST | `/api/v1/vaults` | JWT | REGISTERED_USER+ (plan limits via EntitlementService) |
| GET | `/api/v1/vaults/{vaultId}` | JWT | owner, FAMILY_ADMIN, or relationship with read grant |
| POST | `/api/v1/vaults/{vaultId}/documents` | JWT/Key | `document:create` on vault; returns presigned quarantine PUT |
| GET | `/api/v1/vaults/{vaultId}/documents` | JWT/Key | `document:list`; cursor-paginated, filterable by category/tag/type |
| GET | `/api/v1/documents/{documentId}` | JWT/Key | ABAC: owner, share, or active emergency grant |
| PATCH | `/api/v1/documents/{documentId}` | JWT | `document:update`; blocked while `LegalHold` active |
| DELETE | `/api/v1/documents/{documentId}` | JWT | soft delete; hard-blocked by `LegalHold` |
| GET | `/api/v1/documents/{documentId}/versions` | JWT | `document:read` |
| GET | `/api/v1/documents/{documentId}/versions/{versionId}/download` | JWT/Key | short-lived presigned GET; audited |
| GET | `/api/v1/document-categories` | JWT | any authenticated user |
| POST | `/api/v1/vaults/{vaultId}/tags` | JWT | `vault:update` |
| POST | `/api/v1/documents/{documentId}/legal-holds` | JWT/Key | LAWYER (vault-scoped), SYSTEM_ADMIN; key scope `legal-hold:write` |

### 2.3 `sharing`

| Method | Path | Auth | Policy |
|---|---|---|---|
| POST | `/api/v1/documents/{documentId}/shares` | JWT | owner/FAMILY_ADMIN; `DocumentShare` created |
| GET | `/api/v1/documents/{documentId}/shares` | JWT | owner |
| DELETE | `/api/v1/shares/{shareId}` | JWT | owner (revoke) |
| POST | `/api/v1/documents/{documentId}/secure-links` | JWT | owner; TTL, max views, optional PIN; QR payload returned |
| GET | `/api/v1/secure-links/{token}` | Public | token hash + TTL + view count + optional PIN; fully audited |
| DELETE | `/api/v1/secure-links/{linkId}` | JWT | owner (revoke) |
| POST | `/api/v1/vaults/{vaultId}/access-requests` | JWT | LAWYER/DOCTOR/FINANCIAL_ADVISER requesting access; owner approval flow |

### 2.4 `estate`

| Method | Path | Auth | Policy |
|---|---|---|---|
| POST | `/api/v1/vaults/{vaultId}/beneficiaries` | JWT | owner/FAMILY_ADMIN |
| GET | `/api/v1/vaults/{vaultId}/beneficiaries` | JWT | owner; EXECUTOR after grant |
| POST | `/api/v1/vaults/{vaultId}/executors` | JWT | owner; invite + acceptance ceremony |
| POST | `/api/v1/vaults/{vaultId}/emergency-access-requests` | JWT/Key | EXECUTOR/BENEFICIARY/partner (`emergency:request` scope); evidence attached |
| GET | `/api/v1/emergency-access-requests/{requestId}` | JWT/Key | requester, approvers, owner |
| POST | `/api/v1/emergency-access-requests/{requestId}/approvals` | JWT | designated approvers (multi-party; quorum from vault policy) |
| POST | `/api/v1/emergency-access-requests/{requestId}/objections` | JWT | owner (cancels during time delay) |
| GET | `/api/v1/emergency-access-grants/{grantId}` | JWT/Key | grantee; time-boxed, scope-limited |

Emergency access invariant (never violated): quorum approval **and** time delay **and** owner notification **and** full audit before any `EmergencyAccessGrant` becomes active.

### 2.5 `signature`

| Method | Path | Auth | Policy |
|---|---|---|---|
| POST | `/api/v1/documents/{documentId}/signature-requests` | JWT | owner/LAWYER with vault access |
| GET | `/api/v1/signature-requests/{requestId}` | JWT | requester or invited signer |
| POST | `/api/v1/signature-requests/{requestId}/signatures` | JWT | invited signer; ceremony payload (draw/type/upload) |
| GET | `/api/v1/signatures/{signatureId}/evidence` | JWT/Key | requester, signer, AUDITOR; seal + RFC 3161 timestamp bundle |

### 2.6 `notification`

| Method | Path | Auth | Policy |
|---|---|---|---|
| GET | `/api/v1/notifications` | JWT | self; cursor-paginated |
| PATCH | `/api/v1/notifications/{notificationId}` | JWT | self (mark read) |
| GET | `/api/v1/users/me/notification-preferences` | JWT | self |
| PUT | `/api/v1/users/me/notification-preferences` | JWT | self |
| POST | `/api/v1/vaults/{vaultId}/reminders` | JWT | owner/FAMILY_ADMIN |
| DELETE | `/api/v1/reminders/{reminderId}` | JWT | creator |

### 2.7 `billing`

| Method | Path | Auth | Policy |
|---|---|---|---|
| GET | `/api/v1/plans` | Public | catalogue |
| GET | `/api/v1/subscriptions/current` | JWT | self or COMPANY_ADMIN for org |
| POST | `/api/v1/subscriptions/checkout-session` | JWT | self/COMPANY_ADMIN → Stripe Checkout |
| POST | `/api/v1/subscriptions/portal-session` | JWT | self/COMPANY_ADMIN → Stripe billing portal |
| POST | `/api/v1/webhooks/stripe` | Sig | Stripe signature verification; idempotent |

### 2.8 `audit`

| Method | Path | Auth | Policy |
|---|---|---|---|
| GET | `/api/v1/vaults/{vaultId}/audit-events` | JWT/Key | owner, AUDITOR, EXECUTOR (post-grant); read-only, cursor-paginated |
| GET | `/api/v1/audit-events/{eventId}` | JWT | as above |
| POST | `/api/v1/vaults/{vaultId}/audit-exports` | JWT | owner/AUDITOR; async job → signed download |

### 2.9 `ai`

| Method | Path | Auth | Policy |
|---|---|---|---|
| POST | `/api/v1/documents/{documentId}/ai/classification` | JWT | owner; rejected 409 for CLIENT_ENCRYPTED tier |
| POST | `/api/v1/documents/{documentId}/ai/summary` | JWT | owner; same tier rule |
| GET | `/api/v1/vaults/{vaultId}/ai/recommendations` | JWT | owner; PREMIUM_USER+ entitlement |
| POST | `/api/v1/vaults/{vaultId}/ai/search` | JWT | owner; NL search over Standard-tier index only |

### 2.10 `admin`

| Method | Path | Auth | Policy |
|---|---|---|---|
| GET | `/api/v1/admin/users` | JWT | SYSTEM_ADMIN, SUPER_ADMIN, SUPPORT_AGENT (masked PII) |
| POST | `/api/v1/admin/users/{userId}/suspend` | JWT | SYSTEM_ADMIN+; audited |
| GET | `/api/v1/admin/metrics` | JWT | SYSTEM_ADMIN+, AUDITOR (read) |
| POST | `/api/v1/admin/impersonation-sessions` | JWT | SUPER_ADMIN only; break-glass, time-boxed, owner-notified |

### 2.11 `integration`

| Method | Path | Auth | Policy |
|---|---|---|---|
| POST | `/api/v1/organisations/{orgId}/api-keys` | JWT | COMPANY_ADMIN/HOSPITAL_ADMIN; scopes selected at creation |
| DELETE | `/api/v1/api-keys/{apiKeyId}` | JWT | key owner org admin (revoke) |
| POST | `/api/v1/organisations/{orgId}/webhooks` | JWT/Key | org admin; subscribe to event types |
| GET | `/api/v1/organisations/{orgId}/webhooks/{webhookId}/deliveries` | JWT/Key | org admin; delivery log + redelivery |
| POST | `/api/v1/webhooks/{webhookId}/deliveries/{deliveryId}/redeliver` | JWT/Key | org admin |

## 3. Authentication flows

### 3.1 JWT + refresh rotation
- Access token: JWT RS256, 15 min TTL, verified via JWKS (`/.well-known/jwks.json`); claims: `sub`, `org_id` (active org), `roles`, `sid` (session), `amr` (auth methods).
- Refresh token: opaque, httpOnly+Secure+SameSite=Strict cookie, 30-day sliding window, **rotating**: every refresh issues a new token in the same family; presenting a superseded token (reuse) revokes the entire family and the `Session`, and notifies the user.
- Sessions are server-side records (Redis + `sessions` table) so revocation is immediate despite stateless access tokens (worst case 15 min).

### 3.2 Passkeys (WebAuthn)
- **Registration ceremony:** `registration/options` returns challenge + RP config (RP ID = apex domain) → authenticator creates credential → `registration/verify` validates attestation (packed/none accepted), stores credential public key, sign counter, AAGUID, transports on `Device`.
- **Authentication ceremony:** `authentication/options` (discoverable credentials supported) → assertion → `authentication/verify` checks signature, challenge, origin, RP ID hash, counter regression. Successful passkey login sets `amr: ["webauthn"]` and satisfies 2FA.

### 3.3 TOTP enrolment
`totp/enrol` (requires fresh authentication ≤ 5 min) returns provisioning URI + QR (SHA-1, 6 digits, 30 s period — authenticator-app compatibility) with the secret stored field-level encrypted → user confirms with a valid code at `totp/verify` → 10 single-use recovery codes issued (argon2id-hashed). TOTP is step-up for sensitive actions (emergency-access approval, export, key changes) when no passkey is present.

### 3.4 OAuth2 / OIDC
Authorization-code + PKCE against Google/Microsoft/Apple and enterprise OIDC IdPs (SAML later, per PROJECT_MEMORY). ID-token claims mapped to `User`; account linking requires a verified matching email plus explicit confirmation. DLV itself exposes OIDC-compliant discovery for first-party clients.

### 3.5 API keys (organisations)
- Format `dlv_live_<base62(32)>` / `dlv_test_...`; only the SHA-256 hash is stored; prefix (first 8 chars) kept for identification. Shown once at creation.
- Org-scoped with explicit **scopes**: `org:read`, `vault:read`, `document:read`, `document:write`, `emergency:request`, `emergency:read`, `legal-hold:write`, `webhook:manage`, `audit:read`. Optional IP allowlist and expiry. Every key call is rate-limited per key and fully audited.

### 3.6 Webhooks (HMAC-signed, retry/backoff)
- Headers: `DLV-Webhook-Id`, `DLV-Webhook-Timestamp`, `DLV-Signature: v1=<hex hmac-sha256(secret, id + "." + timestamp + "." + body)>`. Receivers must reject skew > 5 min (replay defence). Secrets are per-subscription, rotatable with dual-secret overlap window.
- Delivery: 2xx within 10 s = success. Retry schedule (exponential + jitter): 30 s, 2 m, 10 m, 1 h, 4 h, 12 h, 24 h (8 attempts), then dead-lettered; subscription auto-disabled after 7 consecutive days of failures with org-admin notification. Redelivery API available.
- Event envelope: `{ "id", "type", "createdAt", "apiVersion": "v1", "data": { ... } }`; event types like `document.promoted`, `document.rejected`, `signature.completed`, `emergency_access.requested`, `emergency_access.granted`, `subscription.updated`.

## 4. Versioning policy

- URI major versions only (`/api/v1`). Breaking changes require `/api/v2`; v1 then enters a **12-month deprecation window** with `Deprecation` and `Sunset` headers and org-admin notices.
- Non-breaking (additive fields, new endpoints/enum values) ship continuously into v1; clients must tolerate unknown fields. Webhook payloads carry `apiVersion`.

## 5. Pagination (cursor)

`GET /api/v1/vaults/{vaultId}/documents?limit=25&cursor=eyJpZCI6IjAxOT...`

- Opaque base64url cursor encoding the keyset (UUIDv7 id + sort key); `limit` 1–100 (default 25).
- Response envelope:

```json
{
  "data": [ { "id": "0197f2a0-...", "type": "LAST_WILL", "title": "Last Will 2026" } ],
  "pageInfo": { "nextCursor": "eyJpZCI6...", "hasNextPage": true }
}
```

No offset pagination anywhere (stable under insertion, index-friendly).

## 6. Error model — RFC 9457 problem+json

All errors return `Content-Type: application/problem+json` with `type` URIs under `https://docs.dlv.stellr-net.com/problems/`.

```json
{
  "type": "https://docs.dlv.stellr-net.com/problems/document-under-legal-hold",
  "title": "Document under legal hold",
  "status": 409,
  "detail": "Document 0197f2a0-7d3e-7bb2-9c1a-4f7e2d9a1c55 cannot be deleted while legal hold LH-2026-0042 is active.",
  "instance": "/api/v1/documents/0197f2a0-7d3e-7bb2-9c1a-4f7e2d9a1c55",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "errors": [ { "field": null, "code": "LEGAL_HOLD_ACTIVE" } ]
}
```

Validation failures use `status: 422` with per-field `errors[]`; authZ denials use 403 (404 where existence itself is confidential, e.g. other tenants' resources); 429 includes `Retry-After`.

## 7. Rate limiting tiers

Token bucket in Redis, keyed by principal; headers `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

| Tier | Sustained | Burst | Applies to |
|---|---|---|---|
| Anonymous (per IP) | 30 req/min | 60 | public endpoints, secure-link access |
| Auth endpoints (per IP+identifier) | 10 req/min | 15 | login, register, token, WebAuthn verify |
| REGISTERED_USER | 120 req/min | 240 | user JWT |
| PREMIUM_USER / FAMILY_ADMIN | 300 req/min | 600 | user JWT |
| Org API key — standard | 600 req/min | 1200 | partner keys |
| Org API key — enterprise | 3000 req/min | 6000 | contracted partners |
| Upload initiations | 60/h per user | — | document creation |
| AI endpoints | 30/h (premium 120/h) | — | `ai` context |

## 8. Idempotency keys

- Required on all POST endpoints that create resources or side effects (enforced 400 if missing on: document create, signature request, emergency-access request, checkout session; accepted everywhere).
- `Idempotency-Key: <uuid>` stored in Redis 24 h with request-body hash + response snapshot. Same key + same hash → replayed response with `Idempotency-Replayed: true`; same key + different hash → `409 idempotency-key-conflict`; concurrent duplicate → `409` until first completes.

## 9. GraphQL schema outline (`/graphql`, read-only)

Code-first NestJS resolvers; queries only (all mutations via REST); depth limit 8, complexity budget 1000, persisted queries in production; reads served from the Postgres read replica; same JWT + CASL policy enforcement per field.

```graphql
type Query {
  dashboard(vaultId: ID!): Dashboard!
  vault(id: ID!): Vault
  activityTimeline(vaultId: ID!, first: Int = 25, after: String, filter: TimelineFilter): AuditEventConnection!
  documentSearch(vaultId: ID!, query: String!, first: Int = 25, after: String): DocumentConnection!
  notifications(first: Int = 25, after: String, unreadOnly: Boolean = false): NotificationConnection!
}

type Dashboard {
  vault: Vault!
  documentCounts: [CategoryCount!]!
  expiringDocuments(withinDays: Int = 90): [Document!]!
  pendingSignatureRequests: [SignatureRequest!]!
  pendingEmergencyAccessRequests: [EmergencyAccessRequest!]!
  storageUsedBytes: BigInt!
  completenessScore: Float!
  recommendations: [AiRecommendation!]!
}

type AuditEventConnection { edges: [AuditEventEdge!]!, pageInfo: PageInfo! }
type AuditEventEdge { node: AuditEvent!, cursor: String! }
type AuditEvent { id: ID!, eventType: String!, actorDisplay: String!, resourceType: String!, resourceId: ID, occurredAt: DateTime!, summary: String! }
type PageInfo { endCursor: String, hasNextPage: Boolean! }
```

## 10. OpenAPI governance

- Spec generated from code (`@nestjs/swagger`, OpenAPI 3.1) — code is the source; the committed `openapi.json` artifact is regenerated in CI and the build **fails on uncommitted drift**.
- CI lint: Spectral with a DLV ruleset (problem+json on all error responses, pagination envelope, operationId naming `<context>_<verb><Resource>`, every operation has `security` + at least one 4xx).
- Breaking-change detection (`oasdiff`) against the last released spec blocks merge without an explicit `api-breaking-approved` review label.
- Published to the developer portal per release tag; SDKs (TypeScript first) generated from the spec.

## 11. Integration patterns — hospitals, law firms, insurers

Partners are `Organisation`s with org-scoped API keys + webhook subscriptions. Three sanctioned patterns:

1. **Scoped API keys (pull).** Example: an insurer with `document:read` limited to `INSURANCE`-type documents in vaults where the vault owner granted the org access via a `DocumentShare`; a law firm with `document:write` + `legal-hold:write` to deposit executed documents and place holds. Keys never grant blanket vault access — ABAC still requires an owner-granted relationship.
2. **Webhook subscriptions (push).** Law firm subscribes to `signature.completed` and `document.promoted` for its clients' shared documents; insurer to `document.expiring`. HMAC-signed, retried per §3.6.
3. **Emergency-access API (hospitals).** `POST /api/v1/vaults/{vaultId}/emergency-access-requests` with key scope `emergency:request` and evidence payload (attending clinician identity, hospital reference, situation code). The request enters the standard workflow — quorum approval + time delay + owner notification are **not bypassable by partners**; on grant, the hospital receives `emergency_access.granted` and can fetch only the granted scope (e.g. `MEDICAL_DIRECTIVE`, `LIVING_WILL`, `EMERGENCY_CONTACTS` document types) via `emergency:read` for the grant's time-boxed window. Every access is audited and visible to the owner/executors.

Onboarding: org verification (registration documents, manual review) → sandbox keys (`dlv_test_`) → production keys with contracted rate tier.
