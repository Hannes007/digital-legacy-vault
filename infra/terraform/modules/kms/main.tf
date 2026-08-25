# =============================================================================
# module: kms — customer-managed CMK + alias with a least-privilege key policy
#
# Security invariant §7.1/§7.2: all data encrypted at rest with a rotated CMK.
# The key policy separates administration from usage and delegates further
# authorization to IAM (see enable_default_root_policy).
# =============================================================================

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  account_root = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"
}

data "aws_iam_policy_document" "key" {
  # --- Delegate to IAM (prevents lockout; scoped by IAM policies) ------------
  dynamic "statement" {
    for_each = var.enable_default_root_policy ? [1] : []
    content {
      sid       = "EnableIAMUserPermissions"
      effect    = "Allow"
      actions   = ["kms:*"]
      resources = ["*"]
      principals {
        type        = "AWS"
        identifiers = [local.account_root]
      }
    }
  }

  # --- Key administrators (manage lifecycle, cannot use for crypto) ----------
  dynamic "statement" {
    for_each = length(var.key_admin_arns) > 0 ? [1] : []
    content {
      sid    = "KeyAdministrators"
      effect = "Allow"
      actions = [
        "kms:Create*", "kms:Describe*", "kms:Enable*", "kms:List*",
        "kms:Put*", "kms:Update*", "kms:Revoke*", "kms:Disable*",
        "kms:Get*", "kms:Delete*", "kms:TagResource", "kms:UntagResource",
        "kms:ScheduleKeyDeletion", "kms:CancelKeyDeletion",
      ]
      resources = ["*"]
      principals {
        type        = "AWS"
        identifiers = var.key_admin_arns
      }
    }
  }

  # --- Key users (crypto operations only) -----------------------------------
  dynamic "statement" {
    for_each = length(var.key_user_arns) > 0 ? [1] : []
    content {
      sid    = "KeyUsers"
      effect = "Allow"
      actions = [
        "kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*",
        "kms:GenerateDataKey*", "kms:DescribeKey",
      ]
      resources = ["*"]
      principals {
        type        = "AWS"
        identifiers = var.key_user_arns
      }
    }
  }

  # --- Grants for AWS services that use the key on the caller's behalf -------
  # (RDS/ElastiCache/EKS create grants; constrained to in-account grantees.)
  dynamic "statement" {
    for_each = length(var.key_user_arns) > 0 ? [1] : []
    content {
      sid       = "AllowAttachmentOfPersistentResources"
      effect    = "Allow"
      actions   = ["kms:CreateGrant", "kms:ListGrants", "kms:RevokeGrant"]
      resources = ["*"]
      principals {
        type        = "AWS"
        identifiers = var.key_user_arns
      }
      condition {
        test     = "Bool"
        variable = "kms:GrantIsForAWSResource"
        values   = ["true"]
      }
    }
  }

  # --- Service-principal statements (CloudWatch Logs, S3 CRR, etc.) ----------
  dynamic "statement" {
    for_each = { for s in var.service_statements : s.sid => s }
    content {
      sid       = statement.value.sid
      effect    = "Allow"
      actions   = statement.value.actions
      resources = ["*"]
      principals {
        type        = "Service"
        identifiers = [statement.value.service]
      }
      dynamic "condition" {
        for_each = statement.value.conditions
        content {
          test     = condition.value.test
          variable = condition.value.variable
          values   = condition.value.values
        }
      }
    }
  }
}

resource "aws_kms_key" "this" {
  description             = var.description
  deletion_window_in_days = var.deletion_window_in_days
  enable_key_rotation     = var.enable_key_rotation
  multi_region            = var.multi_region
  policy                  = data.aws_iam_policy_document.key.json
  tags                    = var.tags
}

resource "aws_kms_alias" "this" {
  name          = "alias/${var.alias}"
  target_key_id = aws_kms_key.this.key_id
}
