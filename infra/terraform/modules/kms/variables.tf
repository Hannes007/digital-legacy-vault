variable "alias" {
  description = "Alias for the CMK, without the 'alias/' prefix (e.g. dlv-dev-data)."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9/_-]+$", var.alias)) && !startswith(var.alias, "aws")
    error_message = "alias must be alphanumeric/-/_/ and must not start with the reserved 'aws' prefix."
  }
}

variable "description" {
  description = "Human-readable description of what this key protects."
  type        = string
}

variable "deletion_window_in_days" {
  description = "Waiting period before key deletion actually removes the CMK."
  type        = number
  default     = 30

  validation {
    condition     = var.deletion_window_in_days >= 7 && var.deletion_window_in_days <= 30
    error_message = "deletion_window_in_days must be between 7 and 30."
  }
}

variable "enable_key_rotation" {
  description = "Enable automatic annual rotation of the CMK backing material (invariant §7.2)."
  type        = bool
  default     = true
}

variable "multi_region" {
  description = "Create a multi-region key (used for the eu-west-1 DR posture)."
  type        = bool
  default     = false
}

variable "enable_default_root_policy" {
  description = <<-EOT
    Add the AWS-recommended "Enable IAM User Permissions" root statement. This is
    NOT a wildcard grant to humans: it delegates access control to IAM policies in
    the account and prevents the key from becoming unmanageable (lockout). Least
    privilege is then enforced through the scoped IAM policies attached to callers.
    Keep enabled unless a break-glass, policy-only key is explicitly required.
  EOT
  type        = bool
  default     = true
}

variable "key_admin_arns" {
  description = "Principal ARNs allowed to administer (not use) the key."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for a in var.key_admin_arns : can(regex("^arn:aws", a))])
    error_message = "Every key_admin_arns entry must be an AWS ARN."
  }
}

variable "key_user_arns" {
  description = "Principal ARNs allowed to use the key for cryptographic operations."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for a in var.key_user_arns : can(regex("^arn:aws", a))])
    error_message = "Every key_user_arns entry must be an AWS ARN."
  }
}

variable "service_statements" {
  description = <<-EOT
    Extra least-privilege statements granting AWS service principals use of the
    key (e.g. CloudWatch Logs, S3 CRR). Each entry: sid, service principal,
    optional actions (defaults to the standard use set), and optional condition
    blocks (test/variable/values) to constrain by encryption context.
  EOT
  type = list(object({
    sid     = string
    service = string
    actions = optional(list(string), [
      "kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*",
      "kms:GenerateDataKey*", "kms:DescribeKey",
    ])
    conditions = optional(list(object({
      test     = string
      variable = string
      values   = list(string)
    })), [])
  }))
  default = []
}

variable "tags" {
  description = "Additional tags merged with provider default_tags."
  type        = map(string)
  default     = {}
}
