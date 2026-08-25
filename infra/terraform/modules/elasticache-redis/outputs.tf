output "primary_endpoint_address" {
  description = "Primary (write) endpoint."
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint_address" {
  description = "Reader endpoint."
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  description = "Redis port."
  value       = 6379
}

output "security_group_id" {
  description = "Security group protecting the cache."
  value       = aws_security_group.this.id
}

output "auth_secret_arn" {
  description = "Secrets Manager ARN holding the AUTH token + connection URL."
  value       = aws_secretsmanager_secret.auth.arn
}
