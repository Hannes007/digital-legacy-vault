terraform {
  required_version = ">= 1.8.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }

  # Chicken-and-egg: this stack CREATES the remote state backend, so it is
  # applied once per account with local state, then migrated:
  #   terraform init && terraform apply
  #   ... uncomment the backend below, then: terraform init -migrate-state
  #
  # backend "s3" {
  #   key = "bootstrap/terraform.tfstate"
  #   # bucket / region / dynamodb_table supplied via -backend-config
  #   # (see infra/README.md)
  # }
}
