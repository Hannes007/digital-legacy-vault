# =============================================================================
# module: rds-postgres — encrypted, private PostgreSQL 16
#
# Security posture:
#   - Storage + PI encrypted with the provided CMK; no public access.
#   - rds.force_ssl = 1 enforced via parameter group (TLS-only, invariant §7.1).
#   - Master credentials generated with random_password and stored ONLY in
#     Secrets Manager (invariant §7.7) — never in tfvars or state outputs.
#   - Ingress on 5432 restricted to the caller-supplied security groups.
# =============================================================================

resource "random_password" "master" {
  length  = 32
  special = true
  # Exclude characters awkward in URIs / that RDS forbids.
  override_special = "!#$%*()-_=+[]{}"
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.identifier}-subnets"
  subnet_ids = var.subnet_ids
  tags       = var.tags
}

# --- Security group ----------------------------------------------------------
resource "aws_security_group" "this" {
  name        = "${var.identifier}-rds"
  description = "DLV RDS PostgreSQL ${var.identifier} — ingress from app tier only"
  vpc_id     = var.vpc_id
  tags       = merge(var.tags, { Name = "${var.identifier}-rds" })
}

resource "aws_vpc_security_group_ingress_rule" "postgres" {
  for_each                     = toset(var.allowed_security_group_ids)
  security_group_id            = aws_security_group.this.id
  referenced_security_group_id = each.value
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL from ${each.value}"
}

# No egress needed for a managed DB; allow return traffic only (stateful SG),
# so we intentionally omit egress rules (default-deny egress).

# --- Parameter group (TLS enforcement + sane logging) ------------------------
resource "aws_db_parameter_group" "this" {
  name        = "${var.identifier}-pg16"
  family      = var.parameter_group_family
  description = "DLV ${var.identifier} — force SSL + logging"

  parameter {
    name  = "rds.force_ssl"
    value = "1" # reject non-TLS connections (invariant §7.1)
  }
  parameter {
    name  = "log_connections"
    value = "1"
  }
  parameter {
    name  = "log_disconnections"
    value = "1"
  }
  parameter {
    name         = "log_min_duration_statement"
    value        = "1000" # log slow (>=1s) queries
    apply_method = "immediate"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

# --- Instance ----------------------------------------------------------------
resource "aws_db_instance" "this" {
  identifier     = var.identifier
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  db_name  = var.db_name
  username = var.master_username
  password = random_password.master.result
  port     = 5432

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage > 0 ? var.max_allocated_storage : null
  storage_type          = var.storage_type
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  publicly_accessible    = false # never internet-reachable (invariant §7.1)

  parameter_group_name = aws_db_parameter_group.this.name

  backup_retention_period   = var.backup_retention_days
  backup_window             = var.backup_window
  maintenance_window        = var.maintenance_window
  copy_tags_to_snapshot     = true
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.identifier}-final-${formatdate("YYYYMMDDhhmmss", timestamp())}"

  performance_insights_enabled    = var.performance_insights_enabled
  performance_insights_kms_key_id = var.performance_insights_enabled ? var.kms_key_arn : null
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  auto_minor_version_upgrade = true
  apply_immediately          = var.apply_immediately

  lifecycle {
    # timestamp() in final_snapshot_identifier changes every plan; ignore it.
    ignore_changes = [final_snapshot_identifier]
  }

  tags = var.tags
}

# --- Credentials secret ------------------------------------------------------
resource "aws_secretsmanager_secret" "credentials" {
  name                    = "dlv/${var.identifier}/rds/credentials"
  description             = "Master credentials + connection info for ${var.identifier}"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = var.secret_recovery_window_days
  tags                    = var.tags
}

resource "aws_secretsmanager_secret_version" "credentials" {
  secret_id = aws_secretsmanager_secret.credentials.id
  secret_string = jsonencode({
    engine   = "postgres"
    username = var.master_username
    password = random_password.master.result
    host     = aws_db_instance.this.address
    port     = aws_db_instance.this.port
    dbname   = var.db_name
    url      = "postgresql://${var.master_username}:${random_password.master.result}@${aws_db_instance.this.address}:${aws_db_instance.this.port}/${var.db_name}?sslmode=require"
  })
}
