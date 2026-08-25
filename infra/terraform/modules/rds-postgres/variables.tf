variable "identifier" {
  description = "DB instance identifier (e.g. dlv-dev)."
  type        = string
}

variable "engine_version" {
  description = "PostgreSQL engine version (major 16 per stack §3)."
  type        = string
  default     = "16.4"

  validation {
    condition     = startswith(var.engine_version, "16")
    error_message = "Only PostgreSQL 16.x is supported by the platform stack."
  }
}

variable "parameter_group_family" {
  description = "RDS parameter group family."
  type        = string
  default     = "postgres16"
}

variable "instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.small"
}

variable "multi_az" {
  description = "Deploy a Multi-AZ standby (prod/staging true; dev false for cost)."
  type        = bool
  default     = true
}

variable "allocated_storage" {
  description = "Initial storage (GiB)."
  type        = number
  default     = 50
}

variable "max_allocated_storage" {
  description = "Upper bound for storage autoscaling (GiB); 0 disables autoscaling."
  type        = number
  default     = 200
}

variable "storage_type" {
  description = "EBS storage type."
  type        = string
  default     = "gp3"
}

variable "kms_key_arn" {
  description = "KMS CMK ARN for storage + Performance Insights encryption."
  type        = string

  validation {
    condition     = can(regex("^arn:aws.*:kms:", var.kms_key_arn))
    error_message = "kms_key_arn must be a KMS key ARN."
  }
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "dlv"
}

variable "master_username" {
  description = "Master username."
  type        = string
  default     = "dlv_admin"

  validation {
    condition     = can(regex("^[a-z_][a-z0-9_]{2,62}$", var.master_username)) && var.master_username != "postgres"
    error_message = "master_username must be lowercase, not 'postgres', 3-63 chars."
  }
}

variable "subnet_ids" {
  description = "Isolated subnet IDs for the DB subnet group."
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "RDS requires subnets in at least two AZs."
  }
}

variable "vpc_id" {
  description = "VPC ID (for the DB security group)."
  type        = string
}

variable "allowed_security_group_ids" {
  description = "Security groups permitted to reach 5432 (e.g. the EKS node/cluster SG)."
  type        = list(string)
  default     = []
}

variable "backup_retention_days" {
  description = "Automated backup retention (days)."
  type        = number
  default     = 14

  validation {
    condition     = var.backup_retention_days >= 1
    error_message = "Keep at least 1 day of automated backups."
  }
}

variable "backup_window" {
  description = "Preferred backup window (UTC)."
  type        = string
  default     = "01:00-02:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window (UTC)."
  type        = string
  default     = "sun:02:30-sun:03:30"
}

variable "deletion_protection" {
  description = "Prevent accidental deletion (true for staging/prod)."
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip the final snapshot on destroy (true only for throwaway dev)."
  type        = bool
  default     = false
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights (KMS-encrypted)."
  type        = bool
  default     = true
}

variable "apply_immediately" {
  description = "Apply modifications immediately instead of in the maintenance window."
  type        = bool
  default     = false
}

variable "secret_recovery_window_days" {
  description = "Secrets Manager recovery window for the credentials secret."
  type        = number
  default     = 7
}

variable "tags" {
  description = "Additional tags merged with provider default_tags."
  type        = map(string)
  default     = {}
}
