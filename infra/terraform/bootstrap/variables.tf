variable "aws_region" {
  description = "Primary region (PROJECT_MEMORY §2.3: af-south-1 primary, eu-west-1 DR)."
  type        = string
  default     = "af-south-1"

  validation {
    condition     = contains(["af-south-1", "eu-west-1"], var.aws_region)
    error_message = "Region must be af-south-1 (primary) or eu-west-1 (DR) per PROJECT_MEMORY §2.3."
  }
}

variable "environment" {
  description = "Environment this account hosts (dev|staging|prod|shared)."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod", "shared"], var.environment)
    error_message = "environment must be one of: dev, staging, prod, shared."
  }
}

variable "github_org" {
  description = "GitHub organisation trusted by the OIDC roles."
  type        = string
  default     = "stellr-sa"
}

variable "github_repo" {
  description = "GitHub repository trusted by the OIDC roles."
  type        = string
  default     = "digital-legacy-vault"
}

variable "create_ecr" {
  description = <<-EOT
    Create the dlv/* ECR repositories and the gha-ecr-push role. Enable only in
    the shared/tooling account (aws-architecture.md §1: ECR lives in dlv-shared).
  EOT
  type        = bool
  default     = false
}

variable "create_terraform_roles" {
  description = "Create the gha-terraform-plan/apply roles for this account's environment."
  type        = bool
  default     = true
}

variable "ecr_repositories" {
  description = "ECR repositories to create when create_ecr is true."
  type        = list(string)
  default     = ["dlv/api", "dlv/web", "dlv/workers"]
}

variable "state_noncurrent_version_expiration_days" {
  description = "Days to retain noncurrent state object versions (rollback window)."
  type        = number
  default     = 90

  validation {
    condition     = var.state_noncurrent_version_expiration_days >= 30
    error_message = "Keep at least 30 days of noncurrent state versions for rollback/forensics."
  }
}
