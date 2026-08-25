output "address" {
  description = "DB instance hostname."
  value       = aws_db_instance.this.address
}

output "endpoint" {
  description = "DB instance endpoint (host:port)."
  value       = aws_db_instance.this.endpoint
}

output "port" {
  description = "DB port."
  value       = aws_db_instance.this.port
}

output "db_name" {
  description = "Initial database name."
  value       = aws_db_instance.this.db_name
}

output "instance_arn" {
  description = "DB instance ARN."
  value       = aws_db_instance.this.arn
}

output "security_group_id" {
  description = "Security group protecting the DB."
  value       = aws_security_group.this.id
}

output "credentials_secret_arn" {
  description = "Secrets Manager ARN holding master credentials + connection URL."
  value       = aws_secretsmanager_secret.credentials.arn
}
