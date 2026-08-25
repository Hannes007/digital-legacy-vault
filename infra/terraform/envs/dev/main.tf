# =============================================================================
# envs/dev — Digital Legacy Vault dev walking-skeleton stack
#
# Composes the reusable modules into one applyable environment:
#   KMS (data CMK) → VPC → EKS → RDS PostgreSQL → ElastiCache Redis → S3 docs
#
# Dev cost/robustness levers: single NAT, SPOT t4g nodes, single-AZ db.t4g.small,
# single-node Redis, CRR off. Staging/prod reuse the same modules with prod values.
#
# Prereqs: the account's bootstrap stack (state backend) is applied and ECR
# exists in the shared account. See infra/README.md.
# =============================================================================

locals {
  name         = "dlv-dev"
  cluster_name = "dlv-dev"
  region       = var.aws_region
}

# --- Data-class CMK ----------------------------------------------------------
# One dev key protects RDS storage/secret, EKS secret envelope, Redis at-rest +
# auth secret, S3 documents/quarantine, and the KMS-encrypted log groups.
# Prod splits these per data class (aws-architecture.md §8).
module "kms_data" {
  source = "../../modules/kms"

  alias          = "${local.name}-data"
  description    = "DLV dev data-class CMK (RDS, EKS secrets, ElastiCache, S3, logs)"
  key_admin_arns = var.key_admin_arns
  key_user_arns  = var.key_user_arns

  # Allow CloudWatch Logs (VPC flow logs + EKS control-plane logs) to use the key,
  # constrained to this account's log groups by encryption context.
  service_statements = [
    {
      sid     = "CloudWatchLogs"
      service = "logs.${local.region}.amazonaws.com"
      conditions = [
        {
          test     = "ArnLike"
          variable = "kms:EncryptionContext:aws:logs:arn"
          values   = ["arn:aws:logs:${local.region}:${data.aws_caller_identity.current.account_id}:*"]
        }
      ]
    }
  ]
}

# --- Network -----------------------------------------------------------------
module "vpc" {
  source = "../../modules/vpc"

  name               = local.name
  vpc_cidr           = var.vpc_cidr
  az_count           = 3
  enable_nat_gateway = true
  single_nat_gateway = true # dev cost lever (one NAT for all AZs)
  enable_flow_logs   = true

  flow_log_kms_key_arn = module.kms_data.key_arn

  # EKS subnet discovery tags.
  public_subnet_tags = {
    "kubernetes.io/role/elb"                        = "1"
    "kubernetes.io/cluster/${local.cluster_name}"   = "shared"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"               = "1"
    "kubernetes.io/cluster/${local.cluster_name}"   = "shared"
  }
}

# --- EKS ---------------------------------------------------------------------
module "eks" {
  source = "../../modules/eks"

  cluster_name       = local.cluster_name
  kubernetes_version = var.kubernetes_version
  subnet_ids         = module.vpc.private_subnet_ids
  kms_key_arn        = module.kms_data.key_arn

  endpoint_private_access = true
  endpoint_public_access  = true # dev convenience; CIDR-restricted below
  public_access_cidrs     = var.eks_public_access_cidrs

  node_instance_types = ["t4g.medium"]
  node_capacity_type  = "SPOT" # dev cost lever
  node_desired_size   = 2
  node_min_size       = 2
  node_max_size       = 4
}

# --- RDS PostgreSQL ----------------------------------------------------------
module "rds" {
  source = "../../modules/rds-postgres"

  identifier            = local.name
  instance_class        = "db.t4g.small"
  multi_az              = false # dev
  allocated_storage     = 20
  max_allocated_storage = 100
  kms_key_arn           = module.kms_data.key_arn
  db_name               = "dlv"

  subnet_ids                 = module.vpc.isolated_subnet_ids
  vpc_id                     = module.vpc.vpc_id
  allowed_security_group_ids = [module.eks.cluster_security_group_id]

  backup_retention_days = 7
  deletion_protection   = false # dev
  skip_final_snapshot   = true  # dev throwaway
}

# --- ElastiCache Redis -------------------------------------------------------
module "redis" {
  source = "../../modules/elasticache-redis"

  name               = local.name
  node_type          = "cache.t4g.small"
  num_cache_clusters = 1     # single node for dev
  automatic_failover_enabled = false
  multi_az_enabled           = false
  kms_key_arn                = module.kms_data.key_arn

  subnet_ids                 = module.vpc.isolated_subnet_ids
  vpc_id                     = module.vpc.vpc_id
  allowed_security_group_ids = [module.eks.cluster_security_group_id]

  snapshot_retention_limit = 1
}

# --- S3 document storage -----------------------------------------------------
module "documents" {
  source = "../../modules/s3-documents"

  name_prefix = local.name
  kms_key_arn = module.kms_data.key_arn

  object_lock_days   = var.documents_object_lock_days # short in dev for teardown
  enable_replication = false                          # DR CRR engaged in staging/prod
  force_destroy      = true                           # dev throwaway
}
