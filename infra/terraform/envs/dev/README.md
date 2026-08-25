# envs/dev — Digital Legacy Vault dev stack

Composes the reusable Terraform modules into the dev "walking skeleton":
KMS → VPC → EKS → RDS PostgreSQL → ElastiCache Redis → S3 (quarantine + documents).

## Dev sizing (cost levers)
- VPC: 3 AZs, **single NAT gateway**.
- EKS: **SPOT `t4g.medium`** nodes (2–4), private + CIDR-restricted public endpoint.
- RDS: **`db.t4g.small`, single-AZ**, deletion protection off, skip final snapshot.
- Redis: **single `cache.t4g.small`** node (no failover).
- S3: CRR **off**, `force_destroy` on, short Object Lock for teardown.

Staging/prod reuse the same modules with HA values (multi-AZ, on-demand, CRR on).

## Apply
```bash
cd infra/terraform/envs/dev
terraform init \
  -backend-config="bucket=dlv-terraform-state-<dev_account_id>" \
  -backend-config="region=af-south-1"
cp dev.example.tfvars dev.tfvars   # then edit
terraform plan  -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```

In CI this runs via the OIDC `dlv-gha-terraform-plan-dev` / `-apply-dev` roles
(see `.github/workflows/terraform.yml`); the backend bucket/region are injected
at init time.

## After apply
The RDS + Redis secret ARNs and the OIDC provider ARN are outputs. Wire them into
the cluster via External Secrets Operator (for `dlv-*-secrets`) and into the Helm
chart's ServiceAccount IRSA annotations. See `infra/README.md`.
