provider "aws" {
  region = var.aws_region

  # Mandatory cost-allocation + ownership tags on every resource
  # (aws-architecture.md §14; PROJECT_MEMORY §9 conventions).
  default_tags {
    tags = {
      Project   = "digital-legacy-vault"
      Env       = var.environment
      ManagedBy = "terraform"
      Stack     = "bootstrap"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
