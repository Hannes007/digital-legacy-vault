# module: vpc

Three-tier, multi-AZ VPC.

| Tier | Egress | Hosts |
|---|---|---|
| public | Internet Gateway | NAT gateways, public ALBs |
| private | NAT gateway | EKS worker nodes |
| isolated | **none** (local only) | RDS, ElastiCache |

## Design notes
- **Isolated tier has no `0.0.0.0/0` route** — the data plane physically cannot
  reach the internet (defence in depth for invariant §7.1).
- **`single_nat_gateway`** collapses to one NAT for dev cost; production uses one
  per AZ for availability. Per-AZ private route tables make either topology work.
- Subnet CIDRs use fixed tier offsets (`/20` blocks at newbits 0/4/8) so changing
  `az_count` never re-addresses existing subnets.
- **Flow logs** stream to a KMS-encrypted CloudWatch log group (`flow_log_kms_key_arn`).
- Pass EKS discovery tags via `public_subnet_tags` / `private_subnet_tags`
  (`kubernetes.io/role/elb`, `kubernetes.io/cluster/<name>`).

## Outputs
`vpc_id`, `vpc_cidr`, `azs`, `public_subnet_ids`, `private_subnet_ids`,
`isolated_subnet_ids`, `nat_gateway_ids`.
