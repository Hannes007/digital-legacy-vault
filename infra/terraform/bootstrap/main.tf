# =============================================================================
# bootstrap/main.tf — Terraform remote state backend
#
# S3 state bucket (versioned, SSE-KMS, fully private) + DynamoDB lock table.
# Applied once per AWS account before any envs/* stack (see README.md).
# =============================================================================

locals {
  account_id        = data.aws_caller_identity.current.account_id
  state_bucket_name = "dlv-terraform-state-${local.account_id}"
  lock_table_name   = "dlv-terraform-locks"
}

# --- KMS key for state encryption --------------------------------------------
# State can contain sensitive resource attributes, so it gets its own CMK with
# rotation rather than the S3-managed key (security invariant §7.1).
resource "aws_kms_key" "terraform_state" {
  description             = "SSE-KMS key for the Terraform state bucket (${var.environment})"
  enable_key_rotation     = true
  deletion_window_in_days = 30 # maximum pending window — state loss is unrecoverable
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/dlv-${var.environment}-terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}

# --- State bucket -------------------------------------------------------------
resource "aws_s3_bucket" "terraform_state" {
  bucket = local.state_bucket_name

  lifecycle {
    # Guard against accidental `terraform destroy` of the state backend.
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled" # every state revision recoverable
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.terraform_state.arn
    }
    bucket_key_enabled = true # reduces KMS request cost without weakening encryption
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  # All four ON — state must never be publicly reachable under any policy.
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "expire-noncurrent-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = var.state_noncurrent_version_expiration_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Enforce TLS-only access (security invariant §7.1: TLS everywhere).
resource "aws_s3_bucket_policy" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*",
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.terraform_state]
}

# --- Lock table ----------------------------------------------------------------
resource "aws_dynamodb_table" "terraform_locks" {
  name         = local.lock_table_name
  billing_mode = "PAY_PER_REQUEST" # lock traffic is tiny and bursty
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.terraform_state.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}
