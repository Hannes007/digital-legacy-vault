output "region" {
  description = "Deployment region."
  value       = var.aws_region
}

output "vpc_id" {
  description = "VPC ID."
  value       = module.vpc.vpc_id
}

output "eks_cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS API endpoint."
  value       = module.eks.cluster_endpoint
}

output "eks_oidc_provider_arn" {
  description = "OIDC provider ARN for IRSA (used by ServiceAccount annotations in the Helm chart)."
  value       = module.eks.oidc_provider_arn
}

output "rds_credentials_secret_arn" {
  description = "Secrets Manager ARN for RDS credentials (sync via External Secrets)."
  value       = module.rds.credentials_secret_arn
}

output "redis_auth_secret_arn" {
  description = "Secrets Manager ARN for the Redis AUTH token (sync via External Secrets)."
  value       = module.redis.auth_secret_arn
}

output "documents_bucket_id" {
  description = "Documents bucket name."
  value       = module.documents.documents_bucket_id
}

output "quarantine_bucket_id" {
  description = "Quarantine bucket name."
  value       = module.documents.quarantine_bucket_id
}

output "data_kms_key_arn" {
  description = "Data-class CMK ARN."
  value       = module.kms_data.key_arn
}
