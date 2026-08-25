import type { SealEvidence } from '../domain/seal';
import type { SignatureMethod, SignatureRequestStatus } from '@dlv/shared-types';

export const SIGNATURE_REQUEST_REPOSITORY = Symbol('SIGNATURE_REQUEST_REPOSITORY');
export const SIGNATURE_REPOSITORY = Symbol('SIGNATURE_REPOSITORY');
export const TIMESTAMP_AUTHORITY = Symbol('TIMESTAMP_AUTHORITY');

export interface SignatureRequestRecord {
  id: string;
  documentId: string;
  ownerId: string;
  title: string;
  message: string | null;
  status: SignatureRequestStatus;
  signerUserId: string | null;
  signerName: string;
  signerEmail: string;
  expiresAt: Date;
  createdAt: Date;
  completedAt: Date | null;
}

export interface CreateSignatureRequestInput {
  id: string;
  documentId: string;
  ownerId: string;
  title: string;
  message: string | null;
  signerUserId: string | null;
  signerName: string;
  signerEmail: string;
  expiresAt: Date;
}

export interface SignatureRequestRepository {
  create(input: CreateSignatureRequestInput): Promise<SignatureRequestRecord>;
  findById(id: string): Promise<SignatureRequestRecord | null>;
  listByOwner(ownerId: string): Promise<SignatureRequestRecord[]>;
  setStatus(id: string, status: SignatureRequestStatus, completedAt: Date | null): Promise<void>;
}

export interface SignatureRecord {
  id: string;
  requestId: string;
  signerUserId: string;
  method: SignatureMethod;
  signatureImageSha256: string;
  consentText: string;
  consentAcceptedAt: Date;
  documentVersionSha256: string;
  sealDigest: string;
  sealAlgorithm: string;
  tsaAuthority: string;
  tsaToken: string;
  tsaGenTime: Date;
  tsaImprintAlg: string;
  evidence: SealEvidence;
  createdAt: Date;
}

export interface CreateSignatureInput {
  id: string;
  requestId: string;
  signerUserId: string;
  method: SignatureMethod;
  signatureImageSha256: string;
  consentText: string;
  consentAcceptedAt: Date;
  documentVersionSha256: string;
  sealDigest: string;
  sealAlgorithm: string;
  tsaAuthority: string;
  tsaToken: string;
  tsaGenTime: Date;
  tsaImprintAlg: string;
  evidence: SealEvidence;
}

export interface SignatureRepository {
  create(input: CreateSignatureInput): Promise<SignatureRecord>;
  findByRequest(requestId: string): Promise<SignatureRecord | null>;
  findById(id: string): Promise<SignatureRecord | null>;
}

/** Result of stamping a seal digest with a trusted-timestamp authority. */
export interface TimestampResult {
  authority: string;
  /** Opaque token — JSON for the dev issuer, base64 DER for a real TSA. */
  token: string;
  genTime: Date;
  imprintAlgorithm: string;
}

/**
 * RFC 3161 trusted-timestamp authority (PROJECT_MEMORY §2.9). A real TSA is
 * used when configured; otherwise a self-issued, offline-verifiable dev token
 * is minted — mirroring the KMS/dev-KEK envelope pattern.
 */
export interface TimestampAuthority {
  stamp(sealDigestHex: string): Promise<TimestampResult>;
  /** Best-effort independent verification of a previously issued token. */
  verify(sealDigestHex: string, token: { authority: string; token: string }): Promise<boolean>;
}
