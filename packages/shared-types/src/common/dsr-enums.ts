/** POPIA/GDPR data-subject request types (Phase 5). */
export enum DataSubjectRequestType {
  EXPORT = 'EXPORT',
  ERASURE = 'ERASURE',
}

/** Outcome of a data-subject request. */
export enum DataSubjectRequestStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REFUSED = 'REFUSED',
}
