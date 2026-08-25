/** Purposes for which a data subject may grant or withdraw consent (Phase 5). */
export enum ConsentPurpose {
  ELECTRONIC_SIGNATURE = 'ELECTRONIC_SIGNATURE',
  DATA_PROCESSING = 'DATA_PROCESSING',
  MARKETING = 'MARKETING',
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  EMERGENCY_ACCESS_DISCLOSURE = 'EMERGENCY_ACCESS_DISCLOSURE',
}

/** Current state of a consent record. */
export enum ConsentStatus {
  GRANTED = 'GRANTED',
  WITHDRAWN = 'WITHDRAWN',
}
