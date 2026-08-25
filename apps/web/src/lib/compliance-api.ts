/** Typed fetch helpers for the Phase 5 compliance contexts (consent + DSR). */
import type {
  ConsentDto,
  DataSubjectExportDto,
  DataSubjectRequestDto,
  ErasureResultDto,
  RecordConsentRequest,
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
  if (!res.ok) throw new Error(`Compliance API ${String(res.status)} on ${path}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const complianceApi = {
  listConsents: () => req<ConsentDto[]>("/consents"),
  recordConsent: (body: RecordConsentRequest) =>
    req<ConsentDto>("/consents", { method: "POST", body: JSON.stringify(body) }),
  withdrawConsent: (id: string) => req<ConsentDto>(`/consents/${id}/withdraw`, { method: "POST" }),
  exportData: () => req<DataSubjectExportDto>("/data-subject/export"),
  requestErasure: () => req<ErasureResultDto>("/data-subject/erasure", { method: "POST" }),
  listDsrRequests: () => req<DataSubjectRequestDto[]>("/data-subject/requests"),
};
