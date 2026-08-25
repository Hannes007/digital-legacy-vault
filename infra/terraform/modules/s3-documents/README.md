# module: s3-documents

The two-bucket document storage plane behind the upload pipeline (invariant §7.5).

| Bucket | Purpose | Key controls |
|---|---|---|
| `<prefix>-quarantine` | landing zone for uploads pending scan | SSE-KMS, all public access blocked, **objects expire after `quarantine_expiration_days` (default 24h)**, TLS-only + KMS-only policy |
| `<prefix>-documents` | promoted, validated documents | **versioning + Object Lock** (GOVERNANCE default, `object_lock_days` ~7y), SSE-KMS, lifecycle → Glacier for noncurrent versions, optional CRR to DR region |

## Design notes
- **Object Lock** is enabled at creation on the documents bucket (cannot be added
  later) with a default retention; set `object_lock_mode = COMPLIANCE` for
  signed/legal artefacts that must be immutable even to admins.
- **Ownership `BucketOwnerEnforced`** disables ACLs entirely.
- **Bucket policies** deny non-TLS access and any `PutObject` that is not
  `aws:kms` encrypted (invariant §7.1).
- **CRR** is gated by `enable_replication`. The replica bucket (eu-west-1) is
  passed in as `replica_bucket_arn` (+ `replica_kms_key_arn`) and must already
  have versioning and Object Lock enabled; this module wires the replication role
  and configuration (RPO 15 min DR posture, §9). Delete markers and KMS-encrypted
  objects are replicated.

## Outputs
`quarantine_bucket_id/arn`, `documents_bucket_id/arn`, `replication_role_arn`.
