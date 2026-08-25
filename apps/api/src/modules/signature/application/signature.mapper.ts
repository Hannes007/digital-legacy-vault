import type { SignatureRecord, SignatureRequestRecord } from './ports';
import type { SignatureDto, SignatureRequestDto } from '@dlv/shared-types';


/** Maps a signature-request record to its API DTO. */
export function toRequestDto(r: SignatureRequestRecord, signatureId: string | null): SignatureRequestDto {
  return {
    id: r.id,
    documentId: r.documentId,
    ownerId: r.ownerId,
    title: r.title,
    message: r.message,
    status: r.status,
    signerUserId: r.signerUserId,
    signerName: r.signerName,
    signerEmail: r.signerEmail,
    expiresAt: r.expiresAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    signatureId,
  };
}

/** Maps a sealed signature record to its (evidence-metadata) API DTO. */
export function toSignatureDto(s: SignatureRecord): SignatureDto {
  return {
    id: s.id,
    requestId: s.requestId,
    signerUserId: s.signerUserId,
    method: s.method,
    documentVersionSha256: s.documentVersionSha256,
    sealDigest: s.sealDigest,
    sealAlgorithm: s.sealAlgorithm,
    tsaAuthority: s.tsaAuthority,
    tsaGenTime: s.tsaGenTime.toISOString(),
    tsaImprintAlg: s.tsaImprintAlg,
    consentAcceptedAt: s.consentAcceptedAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  };
}
