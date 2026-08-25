# Digital Legacy Vault — v1.0.0 (General Availability)

**Digital Legacy Vault** is now generally available in South Africa: a secure
digital estate vault for individuals, families, and the professionals who serve
them. Built by Stellr SA. POPIA-first, GDPR-ready.

## What you can do at GA
- **Secure vault** — resumable uploads through a quarantine → malware-scan →
  validate → encrypt → promote pipeline; envelope encryption (per-document
  keys), full-text search, versioning, and an optional **Client-Encrypted
  Vault** whose keys never leave your device.
- **Sign in your way** — passwordless passkeys, TOTP 2FA, and enterprise SSO.
- **Sharing & estate** — secure links with QR, beneficiaries and executors,
  and multi-party, time-delayed **emergency access** with owner notification.
- **E-signatures** — an ECTA-aligned signing ceremony with a cryptographic seal
  (SHA-256 evidence + RFC 3161 trusted timestamp) you can verify independently.
- **Compliance built in** — consent records, legal holds, S3 Object Lock WORM,
  and POPIA/GDPR data-subject export & erasure.
- **Plans & billing** — Free through Professional, billed via Stripe (ZAR).
- **AI assistance (opt-in)** — document classification, summaries, estate
  completeness tips, and natural-language search. AI never reads
  Client-Encrypted Vault content.
- **For organisations** — team workspaces, professional client-vault access
  (consent-gated), usage metering, data-residency controls, and a partner API
  with signed webhooks.

## Notes
- Wills still require wet-ink execution under the SA Wills Act; DLV is your
  secure repository, drafting assistant, and evidence-preservation layer.
- Data is kept primary in af-south-1, with eu-west-1 for disaster recovery.

_See CHANGELOG.md for the full commit-level history._
