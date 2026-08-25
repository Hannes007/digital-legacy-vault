# Digital Legacy Vault

Secure digital estate vault for individuals, families, and the professionals who serve them — living wills, last wills, powers of attorney, medical directives, and the full spectrum of legal, medical, financial, and personal documents, with digital signing, controlled sharing, and audited emergency access.

**Status:** Phase 1 (Requirements & Architecture) complete — awaiting approval to begin Phase 2 (Foundation).

## How to navigate this repository

Start with these two files — they govern everything else:

1. **`PROJECT_MEMORY.md`** — canonical decisions: product identity, locked tech stack, bounded contexts, domain entities, roles, security invariants, conventions, policy defaults. Any future change must be reflected here first.
2. **`PROJECT_STATE.md`** — current phase, full document inventory, open items, and proposed next-phase scope.

## Documentation

| Area | Location |
|---|---|
| Requirements (SRS, PRD, user stories, use cases) | `docs/01-requirements/` |
| System, API, AWS, and repo architecture | `docs/02-architecture/` |
| Database ERD and data dictionary | `docs/03-database/` |
| Security architecture, threat model, risk register | `docs/04-security/` |
| Design system and design tokens | `docs/05-design/` |
| Coding standards, git, CI/CD, testing, deployment | `docs/06-engineering/` |
| Development roadmap | `docs/07-planning/` |

## Stack summary

Next.js 15 / React 19 / TypeScript / Tailwind 4 (PWA, WCAG 2.2 AA) · NestJS 11 (REST `/api/v1` + GraphQL) · PostgreSQL 16 + Prisma · Redis 7 / BullMQ · AWS (af-south-1 primary, eu-west-1 DR): EKS, S3 + Object Lock, KMS envelope encryption, CloudFront/WAF/Shield · Terraform + Helm + Argo CD · GitHub Actions.

## Key positioning notes

- POPIA-first, GDPR-ready; ISO 27001 aligned; SOC 2 Type II target; HIPAA-ready architecture.
- Under the SA Wills Act 7 of 1953, wills require wet-ink execution — DLV is the secure repository, drafting assistant, and evidence-preservation layer, not a substitute for legal execution. E-signatures (ECTA) apply to directives, mandates, and consents.
- Tiered encryption: envelope encryption by default; optional zero-knowledge Client-Encrypted Vault per document.
