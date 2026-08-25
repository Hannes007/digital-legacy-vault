variable "aws_region" {
  description = "Primary region (PROJECT_MEMORY §2/§3: af-south-1 primary)."
  type        = string
  default     = "af-south-1"

  validation {
    condition     = contains(["af-south-1", "eu-west-1"], var.aws_region)
    error_message = "Region must be af-south-1 (primary) or eu-west-1 (DR)."
  }
}

variable "vpc_cidr" {
  description = "VPC CIDR for the dev environment."
  type        = string
  default     = "10.10.0.0/16"
}

variable "kubernetes_version" {
  description = "EKS control-plane version."
  type        = string
  default     = "1.30"
}

variable "eks_public_access_cidrs" {
  description = <<-EOT
    CIDRs allowed to reach the EKS public API endpoint (admin + CI egress).
    Must be scoped — 0.0.0.0/0 is rejected by the module. Set in dev.tfvars.
  EOT
  type    = list(string)
  default = []
}

variable "key_admin_arns" {
  description = "Principal ARNs allowed to administer the data CMK (e.g. the platform-admin role)."
  type        = list(string)
  default     = []
}

variable "key_user_arns" {
  description = "Principal ARNs allowed to use the data CMK directly (usually left empty; access is via IAM delegation)."
  type        = list(string)
  default     = []
}

variable "documents_object_lock_days" {
  description = "Object Lock retention for the documents bucket. Kept short in dev to allow teardown; prod uses ~7 years."
  type        = number
  default     = 1
}
