/** Vault-relationship roles scoped to a specific vault via ABAC (PROJECT_MEMORY §6). */
export enum RelationshipRole {
  EXECUTOR = 'EXECUTOR',
  BENEFICIARY = 'BENEFICIARY',
  LAWYER = 'LAWYER',
  DOCTOR = 'DOCTOR',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  FINANCIAL_ADVISER = 'FINANCIAL_ADVISER',
}

export enum EmergencyScope {
  FULL = 'FULL',
  CATEGORY = 'CATEGORY',
  MEDICAL_ONLY = 'MEDICAL_ONLY',
}

export enum EmergencyStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  DELAY_ELAPSED = 'DELAY_ELAPSED',
  ACTIVE = 'ACTIVE',
  DENIED = 'DENIED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum DeathVerificationStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}
