# =============================================================================
# module: s3-documents — quarantine + documents buckets
#
# Upload pipeline (invariant §7.5): client uploads to QUARANTINE; a worker scans
# (ClamAV), magic-byte validates, records SHA-256, then promotes into DOCUMENTS.
# Unscanned quarantine objects self-expire quickly. The documents bucket is
# versioned, Object-Locked, SSE-KMS, lifecycle-tiered to Glacier, and optionally
# replicated cross-region for DR (RPO 15 min, §9).
#
# Both buckets: all public access blocked, TLS-only + KMS-only bucket policies,
# BucketOwnerEnforced ownership (ACLs disabled).
# =============================================================================

locals {
  quarantine_name = "${var.name_prefix}-quarantine"
  documents_name  = "${var.name_prefix}-documents"
  do_replication  = var.enable_replication && var.replica_bucket_arn != null
}

# =========================== QUARANTINE bucket ================================
resource "aws_s3_bucket" "quarantine" {
  bucket        = local.quarantine_name
  force_destroy = var.force_destroy
  tags          = merge(var.tags, { Name = local.quarantine_name, Tier = "quarantine" })
}

resource "aws_s3_bucket_ownership_controls" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "quarantine" {
  bucket                  = aws_s3_bucket.quarantine.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id
  rule {
    id     = "expire-unscanned"
    status = "Enabled"
    filter {}
    expiration {
      days = var.quarantine_expiration_days
    }
    noncurrent_version_expiration {
      noncurrent_days = 1
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

resource "aws_s3_bucket_policy" "quarantine" {
  bucket     = aws_s3_bucket.quarantine.id
  policy     = data.aws_iam_policy_document.quarantine.json
  depends_on = [aws_s3_bucket_public_access_block.quarantine]
}

data "aws_iam_policy_document" "quarantine" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.quarantine.arn, "${aws_s3_bucket.quarantine.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
  statement {
    sid       = "DenyUnencryptedPuts"
    effect    = "Deny"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.quarantine.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }
}

# =========================== DOCUMENTS bucket =================================
resource "aws_s3_bucket" "documents" {
  bucket              = local.documents_name
  force_destroy       = var.force_destroy
  object_lock_enabled = true # must be set at creation
  tags                = merge(var.tags, { Name = local.documents_name, Tier = "documents" })
}

resource "aws_s3_bucket_ownership_controls" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket                  = aws_s3_bucket.documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled" # required for Object Lock + replication
  }
}

resource "aws_s3_bucket_object_lock_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    default_retention {
      mode = var.object_lock_mode
      days = var.object_lock_days
    }
  }
  depends_on = [aws_s3_bucket_versioning.documents]
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    id     = "tier-noncurrent-to-glacier"
    status = "Enabled"
    filter {}
    noncurrent_version_transition {
      noncurrent_days = var.glacier_transition_days
      storage_class   = "GLACIER"
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_policy" "documents" {
  bucket     = aws_s3_bucket.documents.id
  policy     = data.aws_iam_policy_document.documents.json
  depends_on = [aws_s3_bucket_public_access_block.documents]
}

data "aws_iam_policy_document" "documents" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.documents.arn, "${aws_s3_bucket.documents.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
  statement {
    sid       = "DenyUnencryptedPuts"
    effect    = "Deny"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.documents.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }
}

# =========================== Cross-region replication ========================
data "aws_iam_policy_document" "replication_assume" {
  count = local.do_replication ? 1 : 0
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "replication" {
  count              = local.do_replication ? 1 : 0
  name               = "${var.name_prefix}-s3-crr"
  assume_role_policy = data.aws_iam_policy_document.replication_assume[0].json
  tags               = var.tags
}

data "aws_iam_policy_document" "replication" {
  count = local.do_replication ? 1 : 0

  statement {
    sid       = "SourceRead"
    effect    = "Allow"
    actions   = ["s3:GetReplicationConfiguration", "s3:ListBucket"]
    resources = [aws_s3_bucket.documents.arn]
  }
  statement {
    sid       = "SourceObjectRead"
    effect    = "Allow"
    actions   = ["s3:GetObjectVersionForReplication", "s3:GetObjectVersionAcl", "s3:GetObjectVersionTagging", "s3:GetObjectRetention", "s3:GetObjectLegalHold"]
    resources = ["${aws_s3_bucket.documents.arn}/*"]
  }
  statement {
    sid       = "DestWrite"
    effect    = "Allow"
    actions   = ["s3:ReplicateObject", "s3:ReplicateDelete", "s3:ReplicateTags", "s3:ObjectOwnerOverrideToBucketOwner"]
    resources = ["${var.replica_bucket_arn}/*"]
  }
  statement {
    sid       = "SourceKmsDecrypt"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [var.kms_key_arn]
  }
  statement {
    sid       = "DestKmsEncrypt"
    effect    = "Allow"
    actions   = ["kms:Encrypt", "kms:GenerateDataKey"]
    resources = [var.replica_kms_key_arn]
  }
}

resource "aws_iam_role_policy" "replication" {
  count  = local.do_replication ? 1 : 0
  name   = "s3-crr"
  role   = aws_iam_role.replication[0].id
  policy = data.aws_iam_policy_document.replication[0].json
}

resource "aws_s3_bucket_replication_configuration" "documents" {
  count      = local.do_replication ? 1 : 0
  bucket     = aws_s3_bucket.documents.id
  role       = aws_iam_role.replication[0].arn
  depends_on = [aws_s3_bucket_versioning.documents]

  rule {
    id       = "replicate-all"
    status   = "Enabled"
    priority = 0

    filter {}

    delete_marker_replication {
      status = "Enabled"
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }

    destination {
      bucket        = var.replica_bucket_arn
      storage_class = "STANDARD"
      encryption_configuration {
        replica_kms_key_id = var.replica_kms_key_arn
      }
    }
  }
}
