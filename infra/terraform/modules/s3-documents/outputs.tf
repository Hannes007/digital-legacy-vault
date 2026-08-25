output "quarantine_bucket_id" {
  description = "Quarantine bucket name."
  value       = aws_s3_bucket.quarantine.id
}

output "quarantine_bucket_arn" {
  description = "Quarantine bucket ARN."
  value       = aws_s3_bucket.quarantine.arn
}

output "documents_bucket_id" {
  description = "Documents bucket name."
  value       = aws_s3_bucket.documents.id
}

output "documents_bucket_arn" {
  description = "Documents bucket ARN."
  value       = aws_s3_bucket.documents.arn
}

output "replication_role_arn" {
  description = "S3 replication IAM role ARN (null when replication is disabled)."
  value       = local.do_replication ? aws_iam_role.replication[0].arn : null
}
