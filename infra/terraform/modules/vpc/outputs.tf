output "vpc_id" {
  description = "VPC ID."
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "VPC primary CIDR."
  value       = aws_vpc.this.cidr_block
}

output "azs" {
  description = "Availability Zones used."
  value       = local.azs
}

output "public_subnet_ids" {
  description = "Public subnet IDs (ALB, NAT)."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs (EKS nodes)."
  value       = aws_subnet.private[*].id
}

output "isolated_subnet_ids" {
  description = "Isolated (no-egress) subnet IDs (RDS, ElastiCache)."
  value       = aws_subnet.isolated[*].id
}

output "nat_gateway_ids" {
  description = "NAT gateway IDs."
  value       = aws_nat_gateway.this[*].id
}
