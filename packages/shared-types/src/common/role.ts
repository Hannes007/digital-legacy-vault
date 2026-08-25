/**
 * Canonical platform and vault-relationship roles (PROJECT_MEMORY §6).
 *
 * Platform roles (`SYSTEM_ADMIN`, `SUPER_ADMIN`, `AUDITOR`, `SUPPORT_AGENT`) apply globally.
 * Vault-relationship roles (`EXECUTOR`, `BENEFICIARY`, `LAWYER`, `DOCTOR`, …) are always
 * scoped to a specific Vault via ABAC policies and must never be treated as global grants.
 */
export enum Role {
  /** Unauthenticated visitor; may only access public resources. */
  GUEST = 'GUEST',
  /** Verified account on the free tier. */
  REGISTERED_USER = 'REGISTERED_USER',
  /** Paying individual subscriber. */
  PREMIUM_USER = 'PREMIUM_USER',
  /** Administrator of a family plan; manages member seats and shared vault policy. */
  FAMILY_ADMIN = 'FAMILY_ADMIN',
  /** Appointed executor of a specific vault owner's estate (vault-scoped). */
  EXECUTOR = 'EXECUTOR',
  /** Named beneficiary of a specific vault (vault-scoped). */
  BENEFICIARY = 'BENEFICIARY',
  /** Legal professional granted vault-scoped access by the owner. */
  LAWYER = 'LAWYER',
  /** Medical professional; participates in medical-directive emergency approvals (vault-scoped). */
  DOCTOR = 'DOCTOR',
  /** Administrator of a hospital organisation account. */
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  /** Financial professional granted vault-scoped access by the owner. */
  FINANCIAL_ADVISER = 'FINANCIAL_ADVISER',
  /** Administrator of a company (B2B) organisation account. */
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  /** Platform operations administrator (no vault-content access by default). */
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  /** Highest platform role; break-glass operations only, fully audited. */
  SUPER_ADMIN = 'SUPER_ADMIN',
  /** Read-only access to audit trails and compliance evidence. */
  AUDITOR = 'AUDITOR',
  /** Customer-support role; excluded from emergency-access approvals. */
  SUPPORT_AGENT = 'SUPPORT_AGENT',
}
