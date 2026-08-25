# Digital Legacy Vault — Git Strategy

| Document control | |
|---|---|
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Engineering Team |
| Related | `PROJECT_MEMORY.md` §8; `docs/06-engineering/cicd-pipeline.md`; `docs/02-architecture/folder-structure.md` |

---

## 1. Repository structure (summary)

Single monorepo `digital-legacy-vault` — pnpm workspaces + Turborepo (PROJECT_MEMORY §2.5). Authoritative layout in `docs/02-architecture/folder-structure.md`; top level:

```
apps/web        # Next.js 15 frontend (PWA)
apps/api        # NestJS 11 backend (REST + GraphQL)
apps/workers    # BullMQ workers (scan pipeline, OCR, notifications)
packages/*      # shared-kernel, crypto, design-tokens, ui, api-client, eslint-config, ...
infra/terraform # all cloud resources
infra/helm      # Helm charts (GitOps source for Argo CD)
docs/           # this documentation tree
```

Hosted on GitHub, private, org `stellr-sa`. GitOps deployment manifests live in-repo under `infra/helm` with per-environment value files; Argo CD watches tagged paths (see deployment-strategy.md).

## 2. Branching model — trunk-based

- **`main` is the trunk.** Always releasable; every merge to `main` deploys to `dev` automatically.
- **Short-lived branches only.** Target lifetime < 2 days, hard ceiling 5 days (stale-branch bot nags at 3, flags at 5). Rebase on `main` before opening/merging the PR.
- **No** long-lived `develop`, release branches, or environment branches. Environments are promoted by artefact + Git tag, not by branch (see cicd-pipeline.md).
- Incomplete features merge behind feature flags (deployment-strategy.md §7) rather than living on long branches.

### Branch naming

```
<type>/<context>-<slug>
```

- `type` ∈ `feat | fix | chore | docs | refactor | perf | test | ci | build | hotfix`
- `context` = bounded context (PROJECT_MEMORY §4): `identity, vault, sharing, estate, signature, notification, billing, audit, ai, admin, integration` — or `platform` / `infra` / `web` for cross-cutting work.
- `slug` = short kebab-case description.

Examples:

```
feat/vault-upload-quarantine-pipeline
fix/estate-emergency-access-quorum-check
chore/platform-node-22-upgrade
hotfix/identity-jwks-cache-expiry
docs/platform-adr-0007-search-index
```

## 3. Conventional Commits

Full [Conventional Commits 1.0.0] compliance, enforced by commitlint in CI and lefthook locally.

```
<type>(<scope>)!: <description>

[body]

[footer(s)]
```

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **Scopes = bounded contexts** (`identity`, `vault`, `sharing`, `estate`, `signature`, `notification`, `billing`, `audit`, `ai`, `admin`, `integration`) plus `web`, `workers`, `infra`, `deps`, `release`. Scope required except for repo-wide `chore`/`docs`.
- **Breaking changes:** `!` after scope **and** a `BREAKING CHANGE:` footer describing migration. Breaking API changes additionally require an ADR.
- Description: imperative, lowercase, no trailing period, ≤72 chars.
- Reference issues in footers: `Refs: DLV-142`, `Fixes: DLV-198`.

Examples:

```
feat(vault): add quarantine-to-clean promotion after ClamAV verdict

Implements the scan pipeline stage that promotes objects from the
quarantine bucket once ClamAV and magic-byte validation pass, and
records the SHA-256 hash on DocumentVersion.

Refs: DLV-87
```

```
fix(estate): require full quorum before emergency access grant activates

Fixes: DLV-201
```

```
feat(identity)!: rotate refresh tokens on every use

BREAKING CHANGE: refresh responses now return a new refresh token;
clients must discard the previous one. api-client >=0.9 required.
```

```
ci(infra): add trivy image scan to pr pipeline
```

Since PRs are squash-merged (§6), the **PR title must itself be a valid Conventional Commit** — it becomes the commit on `main`. Commitlint validates PR titles in CI.

## 4. Pull request rules

| Rule | Value |
|---|---|
| Size | Target ≤400 changed LOC (excl. lockfiles/generated/snapshots); >800 LOC requires splitting or an explicit maintainer override label `size-exception` with justification |
| Reviewers | 1 approval minimum; 2 for changes touching `packages/crypto`, `identity`, `estate` (emergency access), `infra/terraform`, or any file matched by security CODEOWNERS |
| CODEOWNERS | `packages/crypto/** @stellr-sa/security`, `infra/** @stellr-sa/platform`, `apps/api/src/contexts/identity/** @stellr-sa/security`, `docs/05-design/** @stellr-sa/design`, default `* @stellr-sa/engineering` |
| Required checks | lint, typecheck, unit tests + coverage, build, prisma migrate diff, gitleaks, CodeQL, dependency audit, Trivy image scan, commitlint (see cicd-pipeline.md §2) |
| Template | description, screenshots for UI, checklist from coding-standards.md §9, rollout/rollback note for risky changes |
| Merge conditions | branch up to date with `main`; all conversations resolved; no force-push after approval without re-review |
| Draft PRs | encouraged early; CI runs, review optional |

`main` protection: PRs only (no direct pushes, including admins), required checks + reviews as above, linear history, signed commits required, force-push and deletion disabled.

## 5. Releases

- **Tags:** annotated `vX.Y.Z` on `main` (PROJECT_MEMORY §8), SemVer:
  - MAJOR — breaking public API (`/api/v1` contract) or data-contract change
  - MINOR — features
  - PATCH — fixes only
- **Automation:** release-please maintains a release PR aggregating Conventional Commits into `CHANGELOG.md` (Keep-a-Changelog style, grouped by type and scope). Merging the release PR creates the tag + GitHub Release; the tag triggers the staging promotion pipeline (cicd-pipeline.md §4).
- One version for the whole monorepo (apps and packages ship together); internal packages are not published externally in Phases 2–6.
- Pre-releases: `vX.Y.Z-rc.N` tags may be cut for staging soak before a prod release.

## 6. Merge strategy — squash only

- **Squash merge is the only enabled strategy.** One PR = one commit on `main`; trunk history stays linear and every commit is releasable, revertable, and changelog-parsable.
- Squash commit message = PR title (validated Conventional Commit) + PR description body.
- Reverts: `git revert` of the squash commit via a `revert:` PR — never force-push to `main`.
- Merge queue (GitHub) enabled once team size > 4 to keep `main` green under concurrent merges.

## 7. Hotfix flow

Trunk-based means hotfixes also flow through `main` — with a fast path:

1. Branch `hotfix/<context>-<slug>` from `main`.
2. Minimal fix + regression test. PR labelled `hotfix`: still requires 1 review + full required checks (no check-skipping — the pipeline **is** the safety), but reviewers treat it as interrupt-priority.
3. Squash-merge → auto-deploy to `dev`; immediately cut patch tag `vX.Y.(Z+1)` via release-please (hotfix commits fast-track the release PR).
4. Promote through staging (smoke subset of E2E, ~15 min) → prod canary with standard auto-rollback (deployment-strategy.md §5).
5. If `main` contains unreleased risky work that must not ship, revert-or-flag rule applies: the unreleased feature must already be behind a flag (§2); if not, revert it first. **No release branches are cut** — this rule is what keeps that tenable.
6. Post-incident: hotfix linked to the incident review; if the fix bypassed a quality gate gap, a follow-up issue closes the gap.

[Conventional Commits 1.0.0]: https://www.conventionalcommits.org/en/v1.0.0/
