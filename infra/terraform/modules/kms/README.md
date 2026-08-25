# module: kms

Customer-managed KMS key (CMK) + alias with a least-privilege, IAM-delegating
key policy. Backs every at-rest encryption requirement in the platform
(invariant §7.1/§7.2): RDS storage, EKS secret envelope encryption, ElastiCache
at-rest, S3 SSE-KMS, and KMS-encrypted CloudWatch log groups.

## Design notes
- **Rotation on by default** (`enable_key_rotation`) — annual automatic rotation.
- **Admin vs. user separation** — `key_admin_arns` manage the key lifecycle but
  cannot perform crypto; `key_user_arns` can `Encrypt/Decrypt/GenerateDataKey`
  and create AWS-resource grants (constrained by `kms:GrantIsForAWSResource`).
- **`enable_default_root_policy`** adds the AWS-recommended root statement so
  access is governed by IAM policies and the key can't be orphaned. Disable only
  for a deliberately policy-only key.
- **`service_statements`** grants service principals (e.g. `logs.<region>.amazonaws.com`)
  scoped use, optionally constrained by encryption-context conditions.

## Usage
```hcl
module "kms_data" {
  source         = "../../modules/kms"
  alias          = "dlv-dev-data"
  description    = "DLV dev data-class CMK"
  key_admin_arns = var.key_admin_arns
  key_user_arns  = var.key_user_arns
}
```

## Inputs (key)
`alias`, `description`, `key_admin_arns`, `key_user_arns`, `service_statements`,
`multi_region`, `enable_key_rotation`, `deletion_window_in_days`.

## Outputs
`key_arn`, `key_id`, `alias_name`, `alias_arn`.
