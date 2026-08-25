output "key_arn" {
  description = "ARN of the CMK."
  value       = aws_kms_key.this.arn
}

output "key_id" {
  description = "ID of the CMK."
  value       = aws_kms_key.this.key_id
}

output "alias_name" {
  description = "Alias name (with alias/ prefix)."
  value       = aws_kms_alias.this.name
}

output "alias_arn" {
  description = "ARN of the alias."
  value       = aws_kms_alias.this.arn
}
