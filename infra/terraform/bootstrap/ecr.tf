# =============================================================================
# bootstrap/ecr.tf — dlv/* container registries (shared/tooling account only)
# =============================================================================

resource "aws_ecr_repository" "dlv" {
  for_each = var.create_ecr ? toset(var.ecr_repositories) : toset([])

  name = each.value

  # MUTABLE is required because deploy-dev.yml maintains the moving `dev` tag.
  # The promotion contract still uses immutable-by-convention `sha-<gitsha>`
  # tags, and staging/prod pin digests (deployment-strategy.md §2).
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    # Inspector scan-on-push supplements PR-time Trivy (cicd-pipeline.md §3).
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS" # CMK-backed, consistent with invariant §7.1
    kms_key         = aws_kms_key.terraform_state.arn
  }
}

# Keep the registry bounded: expire untagged layers and old sha-* builds.
resource "aws_ecr_lifecycle_policy" "dlv" {
  for_each = aws_ecr_repository.dlv

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep the most recent 200 sha-tagged builds"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["sha-"]
          countType     = "imageCountMoreThan"
          countNumber   = 200
        }
        action = { type = "expire" }
      },
    ]
  })
}
