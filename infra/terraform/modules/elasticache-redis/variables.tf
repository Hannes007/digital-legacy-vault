variable "name" {
  description = "Replication group identifier prefix (e.g. dlv-dev)."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,38}$", var.name))
    error_message = "name must be lowercase alphanumeric/hyphen, start with a letter, <= 39 chars."
  }
}

variable "engine_version" {
  description = "Redis engine version (major 7 per stack §3)."
  type        = string
  default     = "7.1"

  validation {
    condition     = startswith(var.engine_version, "7")
    error_message = "Only Redis 7.x is supported by the platform stack."
  }
}

variable "parameter_group_family" {
  description = "ElastiCache parameter group family."
  type        = string
  default     = "redis7"
}

variable "node_type" {
  description = "Cache node type."
  type        = string
  default     = "cache.t4g.small"
}

variable "num_cache_clusters" {
  description = "Number of nodes (primary + replicas). >=2 enables automatic failover."
  type        = number
  default     = 2

  validation {
    condition     = var.num_cache_clusters >= 1 && var.num_cache_clusters <= 6
    error_message = "num_cache_clusters must be between 1 and 6."
  }
}

variable "automatic_failover_enabled" {
  description = "Enable automatic failover (requires >=2 nodes)."
  type        = bool
  default     = true
}

variable "multi_az_enabled" {
  description = "Place replicas in multiple AZs (requires automatic failover)."
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "KMS CMK ARN for at-rest encryption."
  type        = string

  validation {
    condition     = can(regex("^arn:aws.*:kms:", var.kms_key_arn))
    error_message = "kms_key_arn must be a KMS key ARN."
  }
}

variable "subnet_ids" {
  description = "Isolated subnet IDs for the cache subnet group."
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 1
    error_message = "Provide at least one subnet."
  }
}

variable "vpc_id" {
  description = "VPC ID (for the cache security group)."
  type        = string
}

variable "allowed_security_group_ids" {
  description = "Security groups permitted to reach 6379 (e.g. the EKS node/cluster SG)."
  type        = list(string)
  default     = []
}

variable "snapshot_retention_limit" {
  description = "Days of automatic snapshots to retain (0 disables)."
  type        = number
  default     = 7
}

variable "snapshot_window" {
  description = "Daily snapshot window (UTC)."
  type        = string
  default     = "03:30-04:30"
}

variable "maintenance_window" {
  description = "Weekly maintenance window."
  type        = string
  default     = "sun:04:30-sun:05:30"
}

variable "apply_immediately" {
  description = "Apply changes immediately instead of in the maintenance window."
  type        = bool
  default     = false
}

variable "secret_recovery_window_days" {
  description = "Secrets Manager recovery window for the auth-token secret."
  type        = number
  default     = 7
}

variable "tags" {
  description = "Additional tags merged with provider default_tags."
  type        = map(string)
  default     = {}
}
