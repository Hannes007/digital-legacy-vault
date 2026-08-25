# =============================================================================
# Remote state — S3 backend created by infra/terraform/bootstrap.
#
# Account-specific values (bucket, region) are injected by CI at init time
# (see .github/workflows/terraform.yml), because the state bucket name embeds
# the account ID (dlv-terraform-state-<account_id>). The lock table name is
# stable across accounts and pinned here to match bootstrap.
#
#   terraform init \
#     -backend-config="bucket=dlv-terraform-state-<account_id>" \
#     -backend-config="region=af-south-1"
# =============================================================================
terraform {
  backend "s3" {
    key            = "envs/dev/terraform.tfstate"
    dynamodb_table = "dlv-terraform-locks" # matches bootstrap/main.tf
    encrypt        = true
  }
}
