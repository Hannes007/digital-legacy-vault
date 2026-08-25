/** Lifecycle of a signature request (Phase 5, PROJECT_MEMORY §2.9). */
export enum SignatureRequestStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/** How the signer captured their signature during the ceremony. */
export enum SignatureMethod {
  DRAW = 'DRAW',
  TYPE = 'TYPE',
  UPLOAD = 'UPLOAD',
}
