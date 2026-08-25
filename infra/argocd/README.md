# Argo CD — GitOps delivery

Declarative delivery for Digital Legacy Vault. Argo CD runs in the cluster
(namespace `argocd`) and reconciles this repo; CI never runs `kubectl`/`helm`.

## Layout
- `project.yaml` — the `dlv` AppProject (restricts source repo + destinations).
- `root-app.yaml` — app-of-apps; syncs everything under `apps/`.
- `apps/dlv-dev.yaml` — the dev `Application`: umbrella chart `infra/helm/dlv`
  rendered with `infra/helm/values/dev.yaml` (multi-source `$values` ref).

## Bootstrap (once per cluster)
```bash
kubectl apply -f infra/argocd/project.yaml
kubectl apply -f infra/argocd/root-app.yaml
```
Argo CD then discovers `apps/dlv-dev.yaml` and syncs the dev namespace.

## Release loop
1. Push to `main` → `deploy-dev.yml` builds & pushes `api`/`web`/`workers` images
   (`sha-<gitsha>`), then bumps the tags in `infra/helm/values/dev.yaml`.
2. Argo CD detects the commit and syncs (`prune` + `selfHeal`).
3. The chart's PreSync hook runs `prisma migrate deploy` before app pods roll.

## Prerequisites in-cluster
External Secrets Operator (syncs `dlv-*-secrets` from AWS Secrets Manager),
AWS Load Balancer Controller (the `alb` IngressClass), and metrics-server (HPAs).
Adding staging/prod = drop a new `apps/dlv-<env>.yaml` beside the dev one.
