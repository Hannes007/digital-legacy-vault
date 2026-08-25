import { sealDigestHex } from '@dlv/crypto';
import { SignatureMethod } from '@dlv/shared-types';

/**
 * Signature-seal domain logic (PROJECT_MEMORY §2.9).
 *
 * The seal binds *who signed what, when, and with what consent* into a single
 * canonical evidence bundle whose SHA-256 digest is then trusted-timestamped.
 * Keeping the bundle shape here (versioned) means the digest is reproducible by
 * any independent verifier for the life of the artefact.
 */

/** Default validity window for a signature request, in days. */
export const DEFAULT_EXPIRY_DAYS = 14;
/** Maximum validity window for a signature request, in days (aligns with §9). */
export const MAX_EXPIRY_DAYS = 90;

/** Clamps a requested expiry (days) into the allowed range. */
export function resolveExpiryDays(requested?: number): number {
  if (requested === undefined || !Number.isFinite(requested) || requested <= 0) {
    return DEFAULT_EXPIRY_DAYS;
  }
  return Math.min(Math.floor(requested), MAX_EXPIRY_DAYS);
}

/**
 * Versioned evidence bundle — the exact object the seal digest is computed
 * over. Field names and the `version` tag are part of the contract: changing
 * them would change every future digest, so evolve additively under a new
 * version.
 */
export interface SealEvidence {
  version: 1;
  requestId: string;
  documentId: string;
  /** Plaintext SHA-256 of the signed document version (integrity anchor). */
  documentVersionSha256: string;
  signerUserId: string;
  signerName: string;
  signerEmail: string;
  method: SignatureMethod;
  /** SHA-256 of the captured signature image / typed value. */
  signatureImageSha256: string;
  consentText: string;
  consentAcceptedAt: string;
  ipMasked: string | null;
  userAgent: string | null;
  capturedAt: string;
}

/** Inputs needed to assemble a {@link SealEvidence} bundle. */
export interface BuildEvidenceInput {
  requestId: string;
  documentId: string;
  documentVersionSha256: string;
  signerUserId: string;
  signerName: string;
  signerEmail: string;
  method: SignatureMethod;
  signatureImageSha256: string;
  consentText: string;
  consentAcceptedAt: Date;
  ipMasked: string | null;
  userAgent: string | null;
  capturedAt: Date;
}

/** Assembles the canonical, versioned evidence bundle. */
export function buildSealEvidence(input: BuildEvidenceInput): SealEvidence {
  return {
    version: 1,
    requestId: input.requestId,
    documentId: input.documentId,
    documentVersionSha256: input.documentVersionSha256,
    signerUserId: input.signerUserId,
    signerName: input.signerName,
    signerEmail: input.signerEmail,
    method: input.method,
    signatureImageSha256: input.signatureImageSha256,
    consentText: input.consentText,
    consentAcceptedAt: input.consentAcceptedAt.toISOString(),
    ipMasked: input.ipMasked,
    userAgent: input.userAgent,
    capturedAt: input.capturedAt.toISOString(),
  };
}

/** Computes the seal digest (hex SHA-256 of the canonical evidence bundle). */
export function computeSealDigest(evidence: SealEvidence): string {
  return sealDigestHex(evidence);
}
