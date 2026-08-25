# Release Process — v1.0.0 (GA) and beyond

Complements git-strategy §5 (release-please automation) with the GA specifics.

## Versioning
One SemVer version for the whole monorepo (apps + packages ship together),
annotated tags `vX.Y.Z` on `main` (PROJECT_MEMORY §8). GA is **v1.0.0**.

- **MAJOR** — breaking API/behaviour change (e.g. partner API v2; see
  `docs/08-api/partner-api-versioning.md`).
- **MINOR** — backwards-compatible feature.
- **PATCH** — backwards-compatible fix.

## Cutting a release
1. release-please maintains a release PR aggregating Conventional Commits into
   `CHANGELOG.md` (grouped by type + bounded-context scope).
2. Merging the release PR creates the `vX.Y.Z` tag + GitHub Release.
3. The tag triggers the staging promotion pipeline; prod is a gated,
   two-approver manual promotion (cicd-pipeline §prod).
4. Argo CD is pinned to the released image tag; canary Rollout applies it.

## GA release notes
Published from the template below and linked in launch comms.

## Rollback of a release
Re-point Argo to the previous tag (revert the manifest commit); the canary
abort path returns traffic to stable within seconds (`ga-launch-runbook.md`).
Never hotfix prod outside a tagged release.
