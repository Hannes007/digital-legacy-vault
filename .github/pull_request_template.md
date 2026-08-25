# Pull request

## Summary

<!-- One Conventional-Commit intent per PR. The PR title becomes the squash
     commit message and must be a valid Conventional Commit. -->

## Related

<!-- Issues, ADRs, docs. If a canonical decision changed: PROJECT_MEMORY.md is
     updated in this PR and an ADR is included. -->

## Review checklist (coding-standards.md §9 — reviewer confirms every item)

- [ ] 1. Scope matches one Conventional-Commit intent; size within limits (git-strategy.md §4).
- [ ] 2. Layering respected — no Prisma/AWS imports outside `infrastructure`; no cross-context internal imports.
- [ ] 3. AuthZ: every new endpoint/resolver has an explicit CASL policy; deny-by-default preserved (PROJECT_MEMORY §7.8).
- [ ] 4. Input validated at the boundary (DTO + Zod/class-validator); IDs parsed as UUIDv7.
- [ ] 5. Errors: expected failures as `Result`; responses are problem+json; no leaked internals.
- [ ] 6. Logs structured, no PII; security-relevant actions emit `AuditEvent`s.
- [ ] 7. Migrations follow expand/contract (deployment-strategy.md §6); no destructive change with same-release code dependency.
- [ ] 8. Tests: new behaviour covered per testing-strategy.md; coverage gates green.
- [ ] 9. Tokens/design: UI uses semantic tokens only; new colours updated in both design docs.
- [ ] 10. Docs: TSDoc on new public APIs; ADR if a canonical decision changed.
- [ ] 11. No secrets, keys, or endpoints in code/config (PROJECT_MEMORY §7.7).
- [ ] 12. Accessibility: interactive elements keyboard-operable, labelled, focus-visible.

## Infra-only changes (delete if not applicable)

- [ ] `terraform plan` output on this PR reviewed — no unexpected destroys.
- [ ] No security-control regression (encryption, public access blocks, TLS enforcement, IAM least privilege).
- [ ] Tags (`Project`, `Env`, `ManagedBy`) present on all new resources.
