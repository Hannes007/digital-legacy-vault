/** Lifecycle of a document through the upload pipeline (§7.5). */
export enum DocumentStatus {
  /** Multipart upload initiated; bytes landing in quarantine. */
  PENDING_UPLOAD = 'PENDING_UPLOAD',
  /** Upload complete; ClamAV scan + magic-byte validation in progress. */
  SCANNING = 'SCANNING',
  /** Clean, validated, hashed, encrypted, and promoted to the documents store. */
  READY = 'READY',
  /** ClamAV flagged malware; object destroyed, never promoted. */
  INFECTED = 'INFECTED',
  /** Magic-byte / declared-type mismatch or policy violation; rejected. */
  INVALID = 'INVALID',
  /** Unexpected processing error; safe to retry. */
  FAILED = 'FAILED',
}

/** Result of the antivirus + validation step. */
export enum ScanVerdict {
  PENDING = 'PENDING',
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
  ERROR = 'ERROR',
}

/** Vault protection model. */
export enum VaultKind {
  /** Server-side envelope encryption (per-document DEK wrapped by KMS). */
  STANDARD = 'STANDARD',
  /** Client-Encrypted Vault: content encrypted in the browser; server is zero-knowledge. */
  CLIENT_ENCRYPTED = 'CLIENT_ENCRYPTED',
}
