import type { SignatureMethod, SignatureRequestStatus } from '../common/signature-enums.js';

/** A signing request over a vault document. */
export interface SignatureRequestDto {
  id: string;
  documentId: string;
  ownerId: string;
  title: string;
  message: string | null;
  status: SignatureRequestStatus;
  signerUserId: string | null;
  signerName: string;
  signerEmail: string;
  expiresAt: string; // ISO 8601 UTC
  createdAt: string;
  completedAt: string | null;
  /** Present once the ceremony has produced a sealed signature. */
  signatureId: string | null;
}

/** Create a signature request (document owner). */
export interface CreateSignatureRequest {
  documentId: string;
  title: string;
  signerName: string;
  signerEmail: string;
  message?: string;
  /** Signer's user id when self-signing or inviting a known user. */
  signerUserId?: string;
  /** Expiry in days from creation. Default 14, max 90. */
  expiresInDays?: number;
}

/** Complete the ceremony: capture the signature, consent, and seal it. */
export interface CompleteSignatureRequest {
  method: SignatureMethod;
  /**
   * The captured signature: base64 image bytes (data-URL prefix stripped) for
   * DRAW/UPLOAD, or the typed full name for TYPE. Hashed, never stored raw here.
   */
  signatureImage: string;
  /** The exact consent statement the signer accepted (ECTA intent capture). */
  consentText: string;
}

/** A completed, cryptographically sealed signature (evidence metadata). */
export interface SignatureDto {
  id: string;
  requestId: string;
  signerUserId: string;
  method: SignatureMethod;
  documentVersionSha256: string;
  sealDigest: string;
  sealAlgorithm: string;
  tsaAuthority: string;
  tsaGenTime: string;
  tsaImprintAlg: string;
  consentAcceptedAt: string;
  createdAt: string;
}

/** Result of independently re-verifying a signature seal. */
export interface SealVerificationDto {
  signatureId: string;
  /** Recomputed evidence digest equals the stored seal digest. */
  sealDigestMatches: boolean;
  /** The RFC 3161 / dev timestamp token verifies and stamps this seal digest. */
  timestampValid: boolean;
  /** The signed document's current content hash still matches what was sealed. */
  documentIntegrityIntact: boolean;
  /** All checks passed. */
  valid: boolean;
  checkedAt: string;
  /** Human-readable summary of the outcome. */
  details: string;
}
