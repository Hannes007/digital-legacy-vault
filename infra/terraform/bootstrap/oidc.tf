# =============================================================================
# bootstrap/oidc.tf — GitHub Actions OIDC federation + least-privilege CI roles
#
# No stored AWS keys anywhere in GitHub (cicd-pipeline.md §1): workflows
# exchange a short-lived GitHub OIDC token for temporary AWS credentials.
# Every trust policy pins the exact repository, and where possible the exact
# ref/environment claim, so a compromise of any other repo/workflow in the
# org cannot assume these roles.
# =============================================================================

locals {
  github_oidc_url = "token.actions.githubusercontent.com"
  repo_sub_prefix = "repo:${var.github_org}/${var.github_repo}"

  ecr_repository_arns = [
    for repo in var.ecr_repositories :
    "arn:${data.aws_partition.current.partition}:ecr:${var.aws_region}:${local.account_id}:repository/${repo}"
  ]
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://${local.github_oidc_url}"
  client_id_list  = ["sts.amazonaws.com"]
  # AWS validates GitHub's cert chain against trusted root CAs since 2023, but
  # the API still requires thumbprints; both known GitHub OIDC intermediates
  # are listed for rotation safety.
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]
}

# -----------------------------------------------------------------------------
# Role: dlv-gha-ecr-push — used by deploy-dev.yml (tooling/shared account only)
# Trust: ONLY pushes to main / the `dev` deployment environment of this repo.
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "ecr_push_trust" {
  count = var.create_ecr ? 1 : 0

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.github_oidc_url}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "${local.github_oidc_url}:sub"
      values = [
        "${local.repo_sub_prefix}:ref:refs/heads/main",
        "${local.repo_sub_prefix}:environment:dev",
      ]
    }
  }
}

resource "aws_iam_role" "ecr_push" {
  count = var.create_ecr ? 1 : 0

  name                 = "dlv-gha-ecr-push"
  description          = "GitHub Actions (main branch only): push dlv/* images to ECR"
  assume_role_policy   = data.aws_iam_policy_document.ecr_push_trust[0].json
  max_session_duration = 3600 # one hour is ample for a build+push
}

data "aws_iam_policy_document" "ecr_push" {
  count = var.create_ecr ? 1 : 0

  # GetAuthorizationToken is account-scoped and cannot be resource-restricted.
  statement {
    sid       = "EcrAuth"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  # Push/pull restricted to the dlv/* repositories only.
  statement {
    sid    = "EcrPushPull"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:DescribeImages",
      "ecr:DescribeRepositories",
    ]
    resources = local.ecr_repository_arns
  }
}

resource "aws_iam_role_policy" "ecr_push" {
  count = var.create_ecr ? 1 : 0

  name   = "ecr-push-dlv-repos"
  role   = aws_iam_role.ecr_push[0].id
  policy = data.aws_iam_policy_document.ecr_push[0].json
}

# -----------------------------------------------------------------------------
# Shared policy: remote-state access (both terraform roles need this)
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "terraform_state_access" {
  count = var.create_terraform_roles ? 1 : 0

  statement {
    sid       = "StateList"
    effect    = "Allow"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [aws_s3_bucket.terraform_state.arn]
  }

  statement {
    sid       = "StateReadWrite"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${aws_s3_bucket.terraform_state.arn}/envs/${var.environment}/*"]
  }

  statement {
    sid    = "StateLocking"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
    ]
    resources = [aws_dynamodb_table.terraform_locks.arn]
  }

  statement {
    sid    = "StateKms"
    effect = "Allow"
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:GenerateDataKey",
      "kms:DescribeKey",
    ]
    resources = [aws_kms_key.terraform_state.arn]
  }
}

# -----------------------------------------------------------------------------
# Role: dlv-gha-terraform-plan-<env> — read-only plan on PRs + main
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "terraform_plan_trust" {
  count = var.create_terraform_roles ? 1 : 0

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.github_oidc_url}:aud"
      values   = ["sts.amazonaws.com"]
    }

    # pull_request claim covers PR plans; main covers the pre-apply re-plan.
    condition {
      test     = "StringLike"
      variable = "${local.github_oidc_url}:sub"
      values = [
        "${local.repo_sub_prefix}:pull_request",
        "${local.repo_sub_prefix}:ref:refs/heads/main",
      ]
    }
  }
}

resource "aws_iam_role" "terraform_plan" {
  count = var.create_terraform_roles ? 1 : 0

  name                 = "dlv-gha-terraform-plan-${var.environment}"
  description          = "GitHub Actions: read-only terraform plan for ${var.environment}"
  assume_role_policy   = data.aws_iam_policy_document.terraform_plan_trust[0].json
  max_session_duration = 3600
}

# ReadOnlyAccess lets plan refresh every resource type the env stack manages;
# mutation capability comes only from the apply role below.
resource "aws_iam_role_policy_attachment" "terraform_plan_readonly" {
  count = var.create_terraform_roles ? 1 : 0

  role       = aws_iam_role.terraform_plan[0].name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/ReadOnlyAccess"
}

resource "aws_iam_role_policy" "terraform_plan_state" {
  count = var.create_terraform_roles ? 1 : 0

  name   = "terraform-remote-state"
  role   = aws_iam_role.terraform_plan[0].id
  policy = data.aws_iam_policy_document.terraform_state_access[0].json
}

# -----------------------------------------------------------------------------
# Role: dlv-gha-terraform-apply-<env> — mutations, gated by GitHub environment
# Trust pins the `<env>-infra` environment claim, so the role is only
# assumable AFTER the environment's required-reviewer gate has passed.
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "terraform_apply_trust" {
  count = var.create_terraform_roles ? 1 : 0

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.github_oidc_url}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.github_oidc_url}:sub"
      values   = ["${local.repo_sub_prefix}:environment:${var.environment}-infra"]
    }
  }
}

resource "aws_iam_role" "terraform_apply" {
  count = var.create_terraform_roles ? 1 : 0

  name                 = "dlv-gha-terraform-apply-${var.environment}"
  description          = "GitHub Actions (environment-gated): terraform apply for ${var.environment}"
  assume_role_policy   = data.aws_iam_policy_document.terraform_apply_trust[0].json
  max_session_duration = 7200 # EKS/RDS creation can exceed an hour
}

# Service scope of the env stacks (vpc/eks/rds/redis/s3/kms/secrets/logs).
# IAM is deliberately NOT granted wholesale: role/policy management is
# restricted to the dlv-* namespace so the apply role cannot mint itself or
# anything else broader permissions outside this project's naming boundary.
data "aws_iam_policy_document" "terraform_apply" {
  count = var.create_terraform_roles ? 1 : 0

  statement {
    sid    = "InfraServices"
    effect = "Allow"
    actions = [
      "ec2:*",
      "eks:*",
      "rds:*",
      "elasticache:*",
      "s3:*",
      "kms:*",
      "logs:*",
      "cloudwatch:*",
      "events:*",
      "sqs:*",
      "secretsmanager:*",
      "application-autoscaling:*",
      "autoscaling:*",
      "elasticloadbalancing:*",
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    resources = ["*"]

    # SCP mirror (aws-architecture.md §1): keep all activity inside the
    # approved regions. us-east-1 is included only for global-service reads.
    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [var.aws_region, "eu-west-1", "us-east-1"]
    }
  }

  statement {
    sid    = "IamScopedToProjectNamespace"
    effect = "Allow"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:GetRole",
      "iam:UpdateRole",
      "iam:UpdateAssumeRolePolicy",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:PutRolePolicy",
      "iam:GetRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:ListInstanceProfilesForRole",
      "iam:PassRole",
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:iam::${local.account_id}:role/dlv-*",
    ]
  }

  statement {
    sid    = "IamPolicyNamespace"
    effect = "Allow"
    actions = [
      "iam:CreatePolicy",
      "iam:DeletePolicy",
      "iam:GetPolicy",
      "iam:GetPolicyVersion",
      "iam:ListPolicyVersions",
      "iam:CreatePolicyVersion",
      "iam:DeletePolicyVersion",
      "iam:TagPolicy",
      "iam:UntagPolicy",
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:iam::${local.account_id}:policy/dlv-*",
    ]
  }

  statement {
    sid    = "IamReadAndOidc"
    effect = "Allow"
    actions = [
      "iam:GetOpenIDConnectProvider",
      "iam:CreateOpenIDConnectProvider",
      "iam:TagOpenIDConnectProvider",
      "iam:ListRoles",
      "iam:ListPolicies",
      "iam:CreateServiceLinkedRole", # EKS/RDS/ElastiCache create these on first use
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "terraform_apply" {
  count = var.create_terraform_roles ? 1 : 0

  name   = "terraform-apply-${var.environment}"
  role   = aws_iam_role.terraform_apply[0].id
  policy = data.aws_iam_policy_document.terraform_apply[0].json
}

resource "aws_iam_role_policy" "terraform_apply_state" {
  count = var.create_terraform_roles ? 1 : 0

  name   = "terraform-remote-state"
  role   = aws_iam_role.terraform_apply[0].id
  policy = data.aws_iam_policy_document.terraform_state_access[0].json
}
