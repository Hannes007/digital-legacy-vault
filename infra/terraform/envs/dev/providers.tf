provider "aws" {
  region = var.aws_region

  # Mandatory cost-allocation + ownership tags on every resource
  # (aws-architecture.md §14; PROJECT_MEMORY §8 conventions).
  default_tags {
    tags = {
      Project   = "digital-legacy-vault"
      Env       = "dev"
      ManagedBy = "terraform"
      Stack     = "envs/dev"
    }
  }
}

data "aws_caller_identity" "current" {}
