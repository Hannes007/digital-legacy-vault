# Partner API — versioning policy (v1)

The partner API contract is `partner-openapi.yaml` (OpenAPI 3.1). This policy
governs how it evolves.

## Scheme

URI-versioned: every route lives under `/api/v1/partner/...`. The major
version only changes when a breaking change is unavoidable; `/api/v2` would
then run alongside `/api/v1` for the whole deprecation window.

## What we may change within a major version (non-breaking)

Adding new endpoints, optional request parameters, response fields, enum
values on fields documented as open, webhook event types (endpoints receive
only events they subscribed to), and new API-key scopes. Clients must
therefore ignore unknown response fields and unknown event types.

## What we will never do within a major version (breaking)

Removing or renaming endpoints, fields or scopes; changing field types or
semantics; tightening validation on existing inputs; changing the signature
scheme or authentication; reducing documented rate limits.

## Deprecation

Deprecated endpoints/fields are marked `deprecated: true` in the contract,
announced to registered integration contacts, and kept working for at least
**12 months**. Responses from deprecated endpoints carry a `Deprecation`
header with the sunset date (RFC 8594 `Sunset` header on the final 90 days).

## Webhook contract stability

The delivery envelope (`id`, `type`, `createdAt`, `data`) and the
`X-DLV-Signature` scheme (`t=<unix>,v1=<hex hmac-sha256(secret, t.body)>`)
are stable for the lifetime of v1. New event types are additive. Receivers
must respond 2xx within 5 seconds; retries follow 1m/5m/30m/2h/6h backoff
with a 6-attempt cap, after which the delivery is dead-lettered and visible
in the dashboard (`/integration/webhooks/:id/deliveries`).

## Change log

| Date | Version | Change |
|---|---|---|
| 2026-07-19 | 1.0.0 | Initial contract: ping, documents list; webhook envelope + signing. |
