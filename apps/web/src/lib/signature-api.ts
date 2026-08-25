/** Typed fetch helpers for the Signature context (Phase 5). Bearer from the in-memory store. */
import type {
  CompleteSignatureRequest,
  CreateSignatureRequest,
  SealVerificationDto,
  SignatureDto,
  SignatureRequestDto,
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
  if (!res.ok) throw new Error(`Signature API ${String(res.status)} on ${path}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const signatureApi = {
  listRequests: () => req<SignatureRequestDto[]>("/signature-requests"),
  getRequest: (id: string) => req<SignatureRequestDto>(`/signature-requests/${id}`),
  createRequest: (body: CreateSignatureRequest) =>
    req<SignatureRequestDto>("/signature-requests", { method: "POST", body: JSON.stringify(body) }),
  cancelRequest: (id: string) => req<void>(`/signature-requests/${id}`, { method: "DELETE" }),
  sign: (id: string, body: CompleteSignatureRequest) =>
    req<SignatureDto>(`/signature-requests/${id}/sign`, { method: "POST", body: JSON.stringify(body) }),
  verify: (signatureId: string) => req<SealVerificationDto>(`/signatures/${signatureId}/verification`),
};
