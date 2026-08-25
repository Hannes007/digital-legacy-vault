/** What a legal hold is scoped to (Phase 5). */
export enum LegalHoldScope {
  USER = 'USER',
  VAULT = 'VAULT',
  DOCUMENT = 'DOCUMENT',
}

/** Lifecycle of a legal hold. */
export enum LegalHoldStatus {
  ACTIVE = 'ACTIVE',
  RELEASED = 'RELEASED',
}
