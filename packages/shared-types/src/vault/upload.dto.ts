import type { DocumentType } from '../common/document-type.js';

/** Client → API: begin a resumable multipart upload into quarantine. */
export interface UploadInitRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Number of parts the client will upload (>= 1). */
  partCount: number;
  type?: DocumentType;
  vaultId?: string;
  categoryId?: string;
}

export interface UploadPartUrl {
  partNumber: number;
  url: string;
}

/** API → client: the document handle + presigned part URLs. */
export interface UploadInitResponse {
  documentId: string;
  uploadId: string;
  storageKey: string;
  parts: UploadPartUrl[];
  expiresAt: string;
}

export interface UploadedPart {
  partNumber: number;
  etag: string;
}

/** Client → API: parts uploaded; complete the multipart and enqueue scanning. */
export interface UploadCompleteRequest {
  documentId: string;
  uploadId: string;
  parts: UploadedPart[];
}
