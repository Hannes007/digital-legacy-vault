variable "cluster_name" {
  description = "EKS cluster name."
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes control-plane version."
  type        = string
  default     = "1.30"

  validation {
    condition     = can(regex("^1\\.(2[6-9]|3[0-9])$", var.kubernetes_version))
    error_message = "kubernetes_version must be a supported 1.26+ minor (e.g. 1.30)."
  }
}

variable "subnet_ids" {
  description = "Private subnet IDs for the control-plane ENIs and worker nodes."
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "Provide at least two subnets across distinct AZs."
  }
}

variable "kms_key_arn" {
  description = "KMS CMK ARN for envelope encryption of Kubernetes Secrets."
  type        = string

  validation {
    condition     = can(regex("^arn:aws.*:kms:", var.kms_key_arn))
    error_message = "kms_key_arn must be a KMS key ARN."
  }
}

variable "endpoint_private_access" {
  description = "Enable the private API server endpoint (preferred)."
  type        = bool
  default     = true
}

variable "endpoint_public_access" {
  description = "Enable the public API server endpoint. If true, restrict with public_access_cidrs."
  type        = bool
  default     = false
}

variable "public_access_cidrs" {
  description = "CIDRs allowed to reach the public API endpoint (only used when endpoint_public_access = true)."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for c in var.public_access_cidrs : can(cidrhost(c, 0))])
    error_message = "Every public_access_cidrs entry must be a valid CIDR."
  }

  validation {
    condition     = !contains(var.public_access_cidrs, "0.0.0.0/0")
    error_message = "Refusing 0.0.0.0/0 on the public endpoint — restrict to admin/CI egress CIDRs."
  }
}

variable "cluster_log_types" {
  description = "Control-plane log types to ship to CloudWatch."
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "cluster_log_retention_days" {
  description = "Retention for the control-plane log group."
  type        = number
  default     = 90
}

variable "node_instance_types" {
  description = "Instance types for the managed node group (Graviton/t4g by default)."
  type        = list(string)
  default     = ["t4g.medium"]
}

variable "node_ami_type" {
  description = "AMI type for the node group (ARM64 for Graviton)."
  type        = string
  default     = "AL2023_ARM_64_STANDARD"
}

variable "node_capacity_type" {
  description = "ON_DEMAND or SPOT."
  type        = string
  default     = "ON_DEMAND"

  validation {
    condition     = contains(["ON_DEMAND", "SPOT"], var.node_capacity_type)
    error_message = "node_capacity_type must be ON_DEMAND or SPOT."
  }
}

variable "node_desired_size" {
  description = "Desired node count."
  type        = number
  default     = 3
}

variable "node_min_size" {
  description = "Minimum node count."
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum node count."
  type        = number
  default     = 6
}

variable "node_disk_size" {
  description = "Node root EBS size (GiB)."
  type        = number
  default     = 50
}

variable "addon_versions" {
  description = "Optional pinned versions for core addons; unset entries use the latest compatible."
  type = object({
    vpc_cni    = optional(string)
    coredns    = optional(string)
    kube_proxy = optional(string)
  })
  default = {}
}

variable "tags" {
  description = "Additional tags merged with provider default_tags."
  type        = map(string)
  default     = {}
}
