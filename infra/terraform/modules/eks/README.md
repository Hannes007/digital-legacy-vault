# module: eks

EKS control plane, a managed Graviton (t4g) node group, an IAM OIDC provider for
IRSA, and the core addons (vpc-cni, coredns, kube-proxy).

## Design notes
- **Private endpoint preferred.** `endpoint_public_access` defaults off; when on,
  `public_access_cidrs` is required and `0.0.0.0/0` is rejected by validation.
- **Secret envelope encryption** uses the provided KMS CMK; the cluster role gets
  a scoped inline policy to use it (invariant §7.1).
- **Control-plane logs** (including `audit`) ship to a KMS-encrypted CloudWatch
  log group with configurable retention.
- **IRSA**: an OIDC provider is created so workloads assume least-privilege IAM
  roles (e.g. AWS Load Balancer Controller, External Secrets) instead of using
  node instance-profile credentials.
- Node group `desired_size` change is ignored after creation (autoscaler owns it).
- Nodes carry `AmazonSSMManagedInstanceCore` for keyless access — no inbound SSH.

## Consuming the outputs
- `cluster_security_group_id` → pass to `rds-postgres`/`elasticache-redis` as the
  allowed ingress SG.
- `oidc_provider_arn` / `oidc_provider_url` → build IRSA trust policies and the
  ServiceAccount `eks.amazonaws.com/role-arn` annotations used by the Helm chart.

## Outputs
`cluster_name`, `cluster_endpoint`, `cluster_certificate_authority_data`,
`cluster_security_group_id`, `oidc_provider_arn`, `oidc_provider_url`, `node_role_arn`.
