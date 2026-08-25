# POPIA Operator / GDPR Processor Documentation

DLV processes personal information as both a **responsible party** (its own
account data) and, for organisation customers, as an **operator** (POPIA) /
**processor** (GDPR) acting on the customer's instructions.

## Lawful basis & purpose
Account operation, secure document custody, estate-planning assistance, and
(opt-in) AI features. AI never processes Client-Encrypted Vault content
(type-enforced, PROJECT_MEMORY §2.4).

## Data subject rights (implemented)
Access/portability and erasure via the `data-subject` module: export produces a
portable JSON bundle; erasure performs **crypto-erasure** (destroys wrapped DEKs
so Object-Lock-retained ciphertext is unrecoverable), honouring active legal
holds. Consent is first-class and withdrawable (`consent` module).

## Sub-processors
| Sub-processor | Purpose | Region | Safeguard |
|---|---|---|---|
| AWS | Hosting, storage, KMS | af-south-1 (+ eu-west-1 DR) | DPA, encryption, data-residency controls |
| Anthropic | AI features (opt-in) | Per provider | Zero-retention attestation (M-06); client-encrypted content excluded |
| Stripe | Payments | Global | PCI DSS; no PAN touches DLV (SAQ A) |
| Twilio | SMS/WhatsApp notifications | Global | DPA |
| AWS SES | Email | af-south-1 | DPA |

## Cross-border transfers
SA customer data is primary in af-south-1; eu-west-1 is used for DR only, with a
documented residency-exception record for any failover window (see DR runbook).

## Retention
Signed artefacts + audit: 7 years (Object Lock WORM); trash: 30 days; account
deletion cooling-off: 14 days (PROJECT_MEMORY §9).

## Breach notification
Incident-response runbook defines assessment and the POPIA/GDPR notification
timelines to the Information Regulator / supervisory authority and data subjects.
