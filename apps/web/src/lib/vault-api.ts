/** Typed fetch helpers for the Vault API (Phase 3). Bearer from the in-memory store. */
import type {
  ClientVaultItemDto,
  CreateClientVaultItemRequest,
  DocumentCategoryDto,
  DocumentDto,
  DocumentSearchResult,
  DocumentVersionDto,
  TimelineEntryDto,
  UploadCompleteRequest,
  UploadInitRequest,
  UploadInitResponse,
} from "@dlv/shared-types";

import { tokenStore } from "./token-store";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Vault API ${String(res.status)} on ${path}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const vaultApi = {
  listDocuments: () => req<DocumentDto[]>("/documents"),
  getDocument: (id: string) => req<DocumentDto>(`/documents/${id}`),
  listVersions: (id: string) => req<DocumentVersionDto[]>(`/documents/${id}/versions`),
  timeline: (id: string) => req<TimelineEntryDto[]>(`/documents/${id}/timeline`),
  search: (q: string) => req<DocumentSearchResult[]>(`/documents/search?q=${encodeURIComponent(q)}`),
  listCategories: () => req<DocumentCategoryDto[]>("/document-categories"),
  createCategory: (name: string) =>
    req<DocumentCategoryDto>("/document-categories", { method: "POST", body: JSON.stringify({ name }) }),
  addTag: (id: string, label: string) =>
    req<void>(`/documents/${id}/tags`, { method: "POST", body: JSON.stringify({ label }) }),
  listClientVaultItems: () => req<ClientVaultItemDto[]>("/client-vault/items"),
  createClientVaultItem: (body: CreateClientVaultItemRequest) =>
    req<ClientVaultItemDto>("/client-vault/items", { method: "POST", body: JSON.stringify(body) }),

  /** High-level single-file upload: init → PUT to presigned URL → complete. */
  async uploadFile(file: File): Promise<{ documentId: string; status: string }> {
    const initReq: UploadInitRequest = {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      partCount: 1,
    };
    const init = await req<UploadInitResponse>("/documents/uploads", {
      method: "POST",
      body: JSON.stringify(initReq),
    });
    const part = init.parts[0];
    if (!part) throw new Error("No upload URL returned.");
    const put = await fetch(part.url, { method: "PUT", body: file });
    if (!put.ok) throw new Error("Upload to storage failed.");
    const etag = put.headers.get("etag") ?? "";
    const complete: UploadCompleteRequest = {
      documentId: init.documentId,
      uploadId: init.uploadId,
      parts: [{ partNumber: 1, etag }],
    };
    return req<{ documentId: string; status: string }>("/documents/uploads/complete", {
      method: "POST",
      body: JSON.stringify(complete),
    });
  },
};
