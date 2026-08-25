variable "name" {
  description = "Name prefix for all VPC resources (e.g. dlv-dev)."
  type        = string
}

variable "vpc_cidr" {
  description = "Primary IPv4 CIDR for the VPC."
  type        = string

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0)) && tonumber(split("/", var.vpc_cidr)[1]) <= 20
    error_message = "vpc_cidr must be a valid CIDR of /20 or larger to fit the 3-tier subnet plan."
  }
}

variable "az_count" {
  description = "Number of Availability Zones to span (3 recommended; 2 acceptable for dev cost)."
  type        = number
  default     = 3

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "az_count must be 2 or 3 (af-south-1 has 3 AZs)."
  }
}

variable "enable_nat_gateway" {
  description = "Provision NAT gateways so private subnets have egress."
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use one shared NAT gateway instead of one per AZ (dev cost lever; NOT for prod)."
  type        = bool
  default     = false
}

variable "enable_flow_logs" {
  description = "Enable VPC flow logs to a KMS-encrypted CloudWatch log group."
  type        = bool
  default     = true
}

variable "flow_log_kms_key_arn" {
  description = "KMS CMK ARN used to encrypt the flow-log CloudWatch log group. Required when enable_flow_logs is true."
  type        = string
  default     = null

  validation {
    condition     = var.flow_log_kms_key_arn == null || can(regex("^arn:aws.*:kms:", coalesce(var.flow_log_kms_key_arn, "x")))
    error_message = "flow_log_kms_key_arn must be a KMS key ARN when set."
  }
}

variable "flow_log_retention_days" {
  description = "Retention for the flow-log group."
  type        = number
  default     = 90
}

variable "public_subnet_tags" {
  description = "Extra tags for public subnets (e.g. kubernetes.io/role/elb, cluster discovery)."
  type        = map(string)
  default     = {}
}

variable "private_subnet_tags" {
  description = "Extra tags for private subnets (e.g. kubernetes.io/role/internal-elb, cluster discovery)."
  type        = map(string)
  default     = {}
}

variable "isolated_subnet_tags" {
  description = "Extra tags for isolated (no-egress) data subnets."
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Additional tags merged with provider default_tags."
  type        = map(string)
  default     = {}
}
