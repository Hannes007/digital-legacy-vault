/**
 * Canonical document classification for vault documents (PROJECT_MEMORY §5).
 *
 * Exactly 21 values; the order and spelling are frozen — persistence, the AI
 * classification pipeline, and the OpenAPI contract all depend on these literals.
 * Adding or renaming a value requires a PROJECT_MEMORY update first.
 */
export enum DocumentType {
  /** Living will / advance directive concerning end-of-life care. */
  LIVING_WILL = 'LIVING_WILL',
  /** Last will and testament (DLV stores evidence; wet-ink execution per SA Wills Act). */
  LAST_WILL = 'LAST_WILL',
  /** General or special power of attorney. */
  POWER_OF_ATTORNEY = 'POWER_OF_ATTORNEY',
  /** Medical directive / healthcare proxy instruction. */
  MEDICAL_DIRECTIVE = 'MEDICAL_DIRECTIVE',
  /** Insurance policy (life, disability, household, etc.). */
  INSURANCE = 'INSURANCE',
  /** Passport. */
  PASSPORT = 'PASSPORT',
  /** National identity document (e.g. SA smart ID card). */
  IDENTITY_DOCUMENT = 'IDENTITY_DOCUMENT',
  /** Marriage certificate or civil-union documentation. */
  MARRIAGE_CERTIFICATE = 'MARRIAGE_CERTIFICATE',
  /** Birth certificate. */
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  /** Trust deed and related trust documentation. */
  TRUST = 'TRUST',
  /** Property title deeds, bonds and related records. */
  PROPERTY = 'PROPERTY',
  /** Vehicle registration and ownership papers. */
  VEHICLE_REGISTRATION = 'VEHICLE_REGISTRATION',
  /** Business ownership, shareholding and company records. */
  BUSINESS = 'BUSINESS',
  /** Employment contract and related agreements. */
  EMPLOYMENT_CONTRACT = 'EMPLOYMENT_CONTRACT',
  /** Funeral and burial instructions. */
  FUNERAL_INSTRUCTIONS = 'FUNERAL_INSTRUCTIONS',
  /** Emergency contact list (field-encrypted PII, PROJECT_MEMORY §7.3). */
  EMERGENCY_CONTACTS = 'EMERGENCY_CONTACTS',
  /** Reference to password-manager or credential locations (never raw passwords). */
  PASSWORD_REFERENCE = 'PASSWORD_REFERENCE',
  /** Crypto-asset recovery information (field-encrypted, PROJECT_MEMORY §7.3). */
  CRYPTO_RECOVERY = 'CRYPTO_RECOVERY',
  /** Medical record or health summary. */
  MEDICAL_RECORD = 'MEDICAL_RECORD',
  /** Tax returns, assessments and related filings. */
  TAX = 'TAX',
  /** Anything that does not fit another category. */
  OTHER = 'OTHER',
}
