variable "name_prefix" {
  description = "Prefix for bucket names (e.g. dlv-dev). Buckets: <prefix>-quarantine, <prefix>-documents."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,40}$", var.name_prefix))
    error_message = "name_prefix must be DNS-safe lowercase (a-z0-9-), 2-41 chars."
  }
}

variable "kms_key_arn" {
  description = "KMS CMK ARN for SSE-KMS on both buckets."
  type        = string

  validation {
    condition     = can(regex("^arn:aws.*:kms:", var.kms_key_arn))
    error_message = "kms_key_arn must be a KMS key ARN."
  }
}

variable "quarantine_expiration_days" {
  description = "Days after which unscanned quarantine objects expire (invariant §7.5 keeps this short)."
  type        = number
  default     = 1

  validation {
    condition     = var.quarantine_expiration_days >= 1
    error_message = "quarantine_expiration_days must be >= 1."
  }
}

variable "object_lock_mode" {
  description = "Default Object Lock mode for the documents bucket."
  type        = string
  default     = "GOVERNANCE"

  validation {
    condition     = contains(["GOVERNANCE", "COMPLIANCE"], var.object_lock_mode)
    error_message = "object_lock_mode must be GOVERNANCE or COMPLIANCE."
  }
}

variable "object_lock_days" {
  description = "Default Object Lock retention (days) applied to new document versions."
  type        = number
  default     = 2555 # ~7 years, matches signed-artefact retention (§9)

  validation {
    condition     = var.object_lock_days >= 1
    error_message = "object_lock_days must be >= 1."
  }
}

variable "glacier_transition_days" {
  description = "Days after which noncurrent document versions transition to Glacier."
  type        = number
  default     = 90
}

variable "force_destroy" {
  description = "Allow non-empty bucket deletion (dev convenience only; NEVER prod)."
  type        = bool
  default     = false
}

variable "enable_replication" {
  description = "Enable cross-region replication of the documents bucket to the DR region."
  type        = bool
  default     = false
}

variable "replica_bucket_arn" {
  description = "ARN of the pre-existing DR replica bucket (eu-west-1). Required when enable_replication is true. The replica must have versioning + Object Lock enabled."
  type        = string
  default     = null
}

variable "replica_kms_key_arn" {
  description = "KMS CMK ARN in the replica region used to re-encrypt replicated objects. Required when enable_replication is true."
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags merged with provider default_tags."
  type        = map(string)
  default     = {}
}
